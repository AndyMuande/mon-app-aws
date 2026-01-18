/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_MESSAGESIMAGES_BUCKETNAME
	STORAGE_MESSAGESTABLE_ARN
	STORAGE_MESSAGESTABLE_NAME
	STORAGE_MESSAGESTABLE_STREAMARN
Amplify Params - DO NOT EDIT */
const express = require('express');
const bodyParser = require('body-parser');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Rate limiting simple (en mémoire)
const rateLimitStore = new Map();

const rateLimit = (req, res, next) => {
  // Identifier l'utilisateur (IP ou user)
  const identifier = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // 100 requêtes par minute

  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, []);
  }

  const requests = rateLimitStore.get(identifier);
  const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);

  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Trop de requêtes. Veuillez réessayer dans 1 minute.',
      retryAfter: 60
    });
  }

  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);
  next();
};

// Middleware de validation
const validateMessage = (req, res, next) => {
  const { text, user } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Le champ "text" est requis et doit être une chaîne de caractères',
      field: 'text'
    });
  }

  if (text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Le message ne peut pas être vide',
      field: 'text'
    });
  }

  if (text.length > 5000) {
    return res.status(400).json({
      success: false,
      error: 'Le message ne peut pas dépasser 5000 caractères',
      field: 'text',
      maxLength: 5000
    });
  }

  if (user && typeof user !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Le champ "user" doit être une chaîne de caractères',
      field: 'user'
    });
  }

  next();
};

// Configuration clients AWS SDK v3
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.REGION });

const tableName = process.env.STORAGE_MESSAGESTABLE_NAME;
const bucketName = process.env.STORAGE_MESSAGESIMAGES_BUCKETNAME;

// Log les variables d'environnement pour déboguer
console.log('📋 Configuration Lambda:');
console.log('  Region:', process.env.REGION);
console.log('  Table Name:', tableName);
console.log('  Bucket Name:', bucketName);
console.log('  Env vars disponibles:', Object.keys(process.env).filter(k => k.startsWith('STORAGE_')));

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
app.use(awsServerlessExpressMiddleware.eventContext());

// Appliquer rate limiting à toutes les routes (APRÈS création de app)
app.use(rateLimit);

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }
  next();
});

// Route santé
// Health check avancé
app.get('/messages/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test de connexion DynamoDB
    const command = new ScanCommand({
      TableName: tableName,
      Select: 'COUNT',
      Limit: 1
    });
    
    await dynamodb.send(command);
    
    const responseTime = Date.now() - startTime;
    
    res.json({ 
      status: 'ok',
      service: 'Messages API',
      version: 'v1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        type: 'DynamoDB',
        table: tableName
      },
      performance: {
        responseTime: `${responseTime}ms`
      },
      endpoints: {
        health: 'GET /messages/health',
        list: 'GET /messages',
        create: 'POST /messages',
        update: 'PUT /messages/:id',
        delete: 'DELETE /messages/:id',
        react: 'PUT /messages/:id/reactions',
        docs: 'GET /messages/docs'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error',
      service: 'Messages API',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
      details: error.message
    });
  }
});

// GET tous les messages
app.get('/messages', async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: tableName
    });
    
    const data = await dynamodb.send(command);
    
    // Générer des URLs signées pour les images
    const messagesWithUrls = await Promise.all(
      data.Items.map(async (item) => {
        if (item.imageKey) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: bucketName,
              Key: item.imageKey
            });
            const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
            return { ...item, imageUrl: url };
          } catch (error) {
            console.error('Erreur génération URL signée:', error);
            return item;
          }
        }
        return item;
      })
    );
    
    // Trier par timestamp (plus récent en premier)
    const sortedMessages = messagesWithUrls.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    res.json({ 
      success: true, 
      messages: sortedMessages,
      count: data.Count
    });
  } catch (error) {
    console.error('Erreur GET messages:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST - Créer un message (AVEC VALIDATION)
app.post('/messages', validateMessage, async (req, res) => {
  try {
    const { text, user, imageBase64, imageType } = req.body;

    const newMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      user: user || 'Anonyme',
      timestamp: new Date().toISOString()
    };

    // Gestion de l'image si présente
    if (imageBase64) {
      // Votre code d'upload S3 existant
      newMessage.imageUrl = imageBase64; // Simplification
    }

    const command = new PutCommand({
      TableName: tableName,
      Item: newMessage
    });

    await dynamodb.send(command);
    
    res.status(201).json({  // Code 201 au lieu de 200
      success: true, 
      message: newMessage 
    });
  } catch (error) {
    console.error('Erreur POST message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la création du message',
      details: error.message 
    });
  }
});

// DELETE message (avec suppression de l'image S3 si présente)
app.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer le message pour obtenir l'imageKey
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: { id: id }
    });
    
    const messageData = await dynamodb.send(getCommand);
    
    // Supprimer l'image de S3 si elle existe
    if (messageData.Item && messageData.Item.imageKey) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: messageData.Item.imageKey
        });
        await s3Client.send(deleteCommand);
        console.log('Image supprimée de S3:', messageData.Item.imageKey);
      } catch (error) {
        console.error('Erreur suppression S3:', error);
      }
    }
    
    // Supprimer de DynamoDB
    const deleteCommand = new DeleteCommand({
      TableName: tableName,
      Key: { id: id }
    });

    await dynamodb.send(deleteCommand);
    
    res.json({ 
      success: true, 
      message: 'Message supprimé',
      id: id
    });
  } catch (error) {
    console.error('Erreur DELETE message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// PUT update message (texte + image + badge modifié)
app.put('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, imageBase64, imageType } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le texte ne peut pas être vide' 
      });
    }

    // Base de l'update
    let updateExpression = 'set #text = :text, #edited = :edited, #editedAt = :editedAt';
    let expressionAttributeNames = {
      '#text': 'text',
      '#edited': 'edited',
      '#editedAt': 'editedAt'
    };
    let expressionAttributeValues = {
      ':text': text,
      ':edited': true,
      ':editedAt': new Date().toISOString()
    };

    // Si une nouvelle image est fournie
    if (imageBase64) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const extension = imageType ? imageType.split('/')[1] : 'jpg';
        const imageKey = `messages/${id}.${extension}`;
        
        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: imageKey,
          Body: buffer,
          ContentType: imageType || 'image/jpeg'
        });
        
        await s3Client.send(putCommand);

        updateExpression += ', #imageKey = :imageKey';
        expressionAttributeNames['#imageKey'] = 'imageKey';
        expressionAttributeValues[':imageKey'] = imageKey;

      } catch (error) {
        console.error('Erreur upload S3:', error);
      }
    }

    // Commande finale
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const data = await dynamodb.send(updateCommand);
    
    // Générer l'URL signée pour l'image si présente
    if (data.Attributes.imageKey) {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: data.Attributes.imageKey
      });
      data.Attributes.imageUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    }
    
    res.json({ 
      success: true, 
      message: data.Attributes 
    });

  } catch (error) {
    console.error('Erreur PUT message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// PUT - Ajouter/retirer une réaction
app.put('/messages/:id/reactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji, user } = req.body;
    
    if (!emoji || !user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Emoji et utilisateur requis' 
      });
    }

    const getCommand = new GetCommand({
      TableName: tableName,
      Key: { id }
    });
    
    const { Item } = await dynamodb.send(getCommand);
    
    if (!Item) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message non trouvé' 
      });
    }

    let reactions = Item.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    const userIndex = reactions[emoji].indexOf(user);
    if (userIndex > -1) {
      reactions[emoji].splice(userIndex, 1);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(user);
    }

    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: 'set reactions = :reactions',
      ExpressionAttributeValues: {
        ':reactions': reactions
      },
      ReturnValues: 'ALL_NEW'
    });

    const data = await dynamodb.send(updateCommand);
    
    res.json({ 
      success: true, 
      message: data.Attributes 
    });

  } catch (error) {
    console.error('Erreur réaction:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Documentation de l'API
app.get('/messages/docs', (req, res) => {
  const docs = {
    title: 'Messages API Documentation',
    version: 'v1.0.0',
    description: 'API REST pour la gestion des messages',
    baseURL: req.headers.host,
    endpoints: [
      {
        method: 'GET',
        path: '/messages/health',
        description: 'Vérifier l\'état de l\'API',
        authentication: false,
        response: {
          status: 'ok',
          timestamp: '2026-01-17T...',
          uptime: 123456
        }
      },
      {
        method: 'GET',
        path: '/messages',
        description: 'Récupérer tous les messages',
        authentication: false,
        queryParams: {
          limit: 'Nombre de messages à retourner (optionnel)',
          offset: 'Pagination (optionnel)'
        },
        response: {
          success: true,
          messages: [],
          count: 0
        }
      },
      {
        method: 'POST',
        path: '/messages',
        description: 'Créer un nouveau message',
        authentication: false,
        body: {
          text: 'string (requis, max 5000 caractères)',
          user: 'string (requis)',
          imageBase64: 'string (optionnel)',
          imageType: 'string (optionnel)'
        },
        response: {
          success: true,
          message: {
            id: 'string',
            text: 'string',
            user: 'string',
            timestamp: 'ISO date'
          }
        },
        errors: {
          400: 'Données invalides',
          500: 'Erreur serveur'
        }
      },
      {
        method: 'PUT',
        path: '/messages/:id',
        description: 'Modifier un message existant',
        authentication: false,
        params: {
          id: 'ID du message'
        },
        body: {
          text: 'string (requis)'
        },
        response: {
          success: true,
          message: {}
        },
        errors: {
          400: 'Texte invalide',
          404: 'Message non trouvé',
          500: 'Erreur serveur'
        }
      },
      {
        method: 'DELETE',
        path: '/messages/:id',
        description: 'Supprimer un message',
        authentication: false,
        params: {
          id: 'ID du message'
        },
        response: {
          success: true,
          message: 'Message supprimé',
          id: 'string'
        }
      },
      {
        method: 'PUT',
        path: '/messages/:id/reactions',
        description: 'Ajouter ou retirer une réaction',
        authentication: false,
        params: {
          id: 'ID du message'
        },
        body: {
          emoji: 'string (requis)',
          user: 'string (requis)'
        },
        response: {
          success: true,
          message: {}
        }
      }
    ],
    rateLimiting: {
      requests: 100,
      window: '1 minute',
      errorCode: 429
    },
    errorCodes: {
      200: 'Succès',
      201: 'Créé avec succès',
      400: 'Requête invalide',
      404: 'Ressource non trouvée',
      429: 'Trop de requêtes',
      500: 'Erreur serveur',
      503: 'Service indisponible'
    }
  };

  res.json(docs);
});

module.exports = app;