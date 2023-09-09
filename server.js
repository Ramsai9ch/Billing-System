const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const QrCode = require('qrcode-reader');
const Jimp = require('jimp');
const dbManager = require('./dbManager'); 
const app = express();
app.use(fileUpload());
app.use(express.json());
const crypto = require('crypto');
const session = require('express-session');

// Generate a random secret key
const generateRandomKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

const secretKey = generateRandomKey();
console.log('Generated secret key:', secretKey);
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
  })
);

dbManager.initializeDatabase()
//app.use(express.static(path.join(__dirname, 'public')));
// app.set('view engine', 'ejs');

// Define your routes
app.use('/login', express.static(path.join(__dirname, 'public', 'login.html')));
app.use('/register', express.static(path.join(__dirname, 'public', 'register.html')));
app.use('/index', express.static(path.join(__dirname, 'public', 'index.html')));
app.use('/inventory', express.static(path.join(__dirname, 'public', 'inventory.html')));

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to serve the login.html file
app.get('/login', (req, res) => {
    const error = req.query.error;
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  });

app.post('/upload', (req, res) => {
  if (!req.files || !req.files.fileInput) {
    return res.status(400).send('No file uploaded.');
  }

  const file = req.files.fileInput;

  Jimp.read(file.data, (err, image) => {
    if (err) {
      console.error('Error processing the image:', err);
      return res.status(500).send('Error processing the image.');
    }

    const qr = new QrCode();
    qr.callback = (err, result) => {
      if (err) {
        console.error('Error decoding the QR code:', err);
        return res.status(500).send('Error decoding the QR code.');
      }

      if (result && result.result) {
        console.log('Decoded QR Code check:', result.result);
        // res.json({ qrData: result.result });
        try {
            // Fetch product data from the database based on the decoded product ID
            const productData = dbManager.getProductById(result.result)
            .then((product) => {
            if (product) {
            console.log('Product found:');
            console.log(product);
            res.json({qrData: result.result, productdata:product});
            } else {
            console.log('Product not found.');
            }
            })
            .catch((error) => {
            console.error('Error querying the database:', error);
            });
            if (!productData) {
              return res.status(404).send('Product not found.');
            }
          } catch (err) {
            console.error('Error fetching product data from the database:', err);
            res.status(500).send('Error fetching product data from the database.');
          }       
      } else {
        console.log('No QR code detected.');
        res.status(404).send('No QR code detected.');
      }
    };

    qr.decode(image.bitmap);
  });
});

app.post('/updateDatabase', (req, res) => {
    const soldProducts = req.body; // Assuming the client sends an array of sold products
    console.log('check',soldProducts);
  
    // Update the database for each sold product
    soldProducts.forEach((product_n) => {
      try {
        // Fetch the current product data from the database
        console.log('productid',product_n.productId)
        const productId_n = parseInt(product_n.productId,10)
        const currentProductData = dbManager.getProductById(productId_n)
        .then((product) => {
            if (product) {
            console.log('Product found second time:');
            console.log(product);
            db_prodinfo={...product};
            console.log('qtyleft',db_prodinfo.qtyLeft);
            console.log('itemsSold',db_prodinfo.itemsSold);
            console.log('qtysold',product_n.quantitySold);
            // console.log('itemsSold',db_prodinfo.itemsSold);
            if (db_prodinfo) {
              //Calculate the new quantity left after the sale
              const newQuantityLeft = db_prodinfo.qtyLeft - parseInt(product_n.quantitySold,10);
              // Calculate the new quantity sold for the product
              const newQuantitySold = db_prodinfo.itemsSold + parseInt(product_n.quantitySold,10);
              console.log('newQuantityLeft',newQuantityLeft);
              console.log('newQuantitySold',newQuantitySold);
              // Update the database with the new quantities
              dbManager.updateProductQuantities(product.productId, newQuantityLeft, newQuantitySold);
              console.log('Database updated for product:', product_n.productId);
            } else {
              console.log('Product not found in the database:', product_n.productId);
            }
            
            } else {
            console.log('Product not found.');
            }
            })
        // console.log('u wont get me',currentProductData);

      } catch (err) {
        console.error('Error updating database for product:', product_n.productId);
      }
    });
  
    res.json({ success: true });
  });

  app.post('/login/POST', async (req, res) => {
    const { username, password } = req.body;
  
    // Authenticate user using the dbManager function
    const isAuthenticated = await dbManager.authenticateUser(username, password);
  
    if (isAuthenticated) {
      // If authentication is successful, store the user session and redirect to billing page
      req.session.user = username;
      res.json({ success: true });
    } else {
      // If authentication fails, send a response indicating the failure
      res.json({ success: false, message: 'Invalid username or password. Please try again or Register to create a account.' });
    }
  });
  
  app.get('/register', (req, res) => {
    // Render the registration page
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
  });
  
  app.post('/register/POST', async(req, res) => {
    
    const { username, password } = req.body;
    console.log(username, password)
    try {
      // Check if the username already exists in the database
      const userExists = await dbManager.checkUserExists(username);
      console.log('userExists',userExists)
      if (userExists) {
        console.log('Hi')
        // If the username is already taken, return an error response
        return res.json({ success: false, message: 'Username already taken. Please choose a different username.' });
      }
      else{
      // If the username is available, save the new user to the database
      await dbManager.saveUser(username, password);
      console.log('userSaved')
  
      // Store the user session and send a success response
      req.session.user = username;
      return res.json({ success: true });
      }
    } catch (error) {
      console.error('Error during registration:', error);
      // If there was an error during registration, return an error response
      return res.json({ success: false, message: 'Registration failed. Please try again later.' });
    }
  });
  app.get('/inventory', (req, res) => {
    // Render the registration page
    res.sendFile(path.join(__dirname, 'public', 'inventory.html'));
  });
  app.get('/inventoryData', async (req, res) => {
    try {
      const totalproducts=await dbManager.getInventoryData()
      const topItemsSoldData = await dbManager.getTopItemsSold(5);
      const leastItemsSoldData = await dbManager.getLeastItemsSold(5);
      const lowStockItemsData = await dbManager.getLowStockItems();
  
      const responseData = {
        totalproducts,
        topItemsSoldData,
        leastItemsSoldData,
        lowStockItemsData,
      };
  
      res.json(responseData);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
const port = 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
