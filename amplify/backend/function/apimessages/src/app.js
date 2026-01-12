const express = require('express');
const bodyParser = require('body-parser');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');

// AWS SDK v3 pour Node.js 22
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Configuration DynamoDB
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamodb = DynamoDBDocumentClient.from(client);
const tableName = process.env.STORAGE_MESSAGESTABLE_NAME;

const app = express();
app.use(bodyParser.json());
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
    const command = new ScanCommand({
      TableName: tableName,
      Select: 'COUNT'
    });
    
    const data = await dynamodb.send(command);
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      messagesCount: data.Count || 0,
      tableName: tableName
    });
  } catch (error) {
    console.error('Erreur health check:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      tableName: tableName
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
    
    // Trier par timestamp (plus récent en premier)
    const sortedMessages = (data.Items || []).sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    res.json({ 
      success: true, 
      messages: sortedMessages,
      count: data.Count || 0
    });
  } catch (error) {
    console.error('Erreur GET messages:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST nouveau message
app.post('/messages', async (req, res) => {
  try {
    const { text, user } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le message ne peut pas être vide' 
      });
    }

    const newMessage = {
      id: Date.now().toString(),
      text: text,
      user: user || 'Anonyme',
      timestamp: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: newMessage
    });

    await dynamodb.send(command);
    
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

// DELETE message
app.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const command = new DeleteCommand({
      TableName: tableName,
      Key: { id: id }
    });

    await dynamodb.send(command);
    
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
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le texte ne peut pas être vide' 
      });
    }

    const command = new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: 'set #text = :text, #timestamp = :timestamp',
      ExpressionAttributeNames: {
        '#text': 'text',
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':text': text,
        ':timestamp': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    });

    const data = await dynamodb.send(command);
    
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

module.exports = app;