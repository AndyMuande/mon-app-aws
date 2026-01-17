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
app.get('/messages/health', async (req, res) => {
  try {
    // Vérifier que les variables d'environnement sont définies
    if (!tableName) {
      console.error('❌ STORAGE_MESSAGESTABLE_NAME non défini');
      return res.status(500).json({ 
        status: 'error', 
        error: 'Configuration manquante: tableName',
        debug: { tableName, bucketName }
      });
    }
    
    const command = new ScanCommand({
      TableName: tableName,
      Select: 'COUNT'
    });
    const data = await dynamodb.send(command);
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      messagesCount: data.Count,
      tableName: tableName,
      bucketName: bucketName
    });
  } catch (error) {
    console.error('❌ Erreur health check:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      debug: { tableName, bucketName, region: process.env.REGION }
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

// POST nouveau message avec image optionnelle
app.post('/messages', async (req, res) => {
  try {
    const { text, user, imageBase64, imageType } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le message ne peut pas être vide' 
      });
    }

    const messageId = Date.now().toString();
    const newMessage = {
      id: messageId,
      text: text,
      user: user || 'Anonyme',
      timestamp: new Date().toISOString()
    };

    // Si une image est fournie, l'uploader sur S3
    if (imageBase64) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const extension = imageType ? imageType.split('/')[1] : 'jpg';
        const imageKey = `messages/${messageId}.${extension}`;
        
        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: imageKey,
          Body: buffer,
          ContentType: imageType || 'image/jpeg'
        });
        
        await s3Client.send(putCommand);
        newMessage.imageKey = imageKey;
        
        console.log('Image uploadée avec succès:', imageKey);
      } catch (error) {
        console.error('Erreur upload S3:', error);
      }
    }

    // Sauvegarder dans DynamoDB
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: newMessage
    });

    await dynamodb.send(putCommand);
    
    // Générer l'URL signée si une image a été uploadée
    if (newMessage.imageKey) {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: newMessage.imageKey
      });
      newMessage.imageUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    }
    
    res.status(201).json({ 
      success: true, 
      message: newMessage 
    });
  } catch (error) {
    console.error('Erreur POST message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
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

// PUT update message
app.put('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, imageBase64, imageType } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le texte ne peut pas être vide' 
      });
    }

    let updateExpression = 'set #text = :text, #timestamp = :timestamp';
    let expressionAttributeNames = {
      '#text': 'text',
      '#timestamp': 'timestamp'
    };
    let expressionAttributeValues = {
      ':text': text,
      ':timestamp': new Date().toISOString()
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

    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const data = await dynamodb.send(updateCommand);
    
    // Générer l'URL signée pour l'image
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

app.listen(3000, function() {
    console.log("App started");
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

    // Récupérer le message actuel
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

    // Initialiser les réactions si elles n'existent pas
    let reactions = Item.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    // Toggle : ajouter ou retirer l'utilisateur
    const userIndex = reactions[emoji].indexOf(user);
    if (userIndex > -1) {
      // L'utilisateur a déjà réagi, on retire
      reactions[emoji].splice(userIndex, 1);
      // Supprimer l'emoji si plus personne n'a réagi
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Ajouter la réaction
      reactions[emoji].push(user);
    }

    // Mettre à jour le message
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

module.exports = app;