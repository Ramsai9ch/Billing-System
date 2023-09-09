const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bcrypt = require('bcrypt');
const DB_FILE_PATH = './database.db';

let database;

function initializeDatabase() {
  if (fs.existsSync(DB_FILE_PATH)) {
    // If the database file exists, open the connection to it
    database = new sqlite3.Database(DB_FILE_PATH, (err) => {
      if (err) {
        console.error('Error connecting to the database:', err.message);
      } else {
        console.log('Connected to the database.');
        createTables();

        // Insert generated data into the 'products' table
        insertGeneratedData();
      }
    });
  } else {
    // If the database file does not exist, create it and initialize the tables
    database = new sqlite3.Database(DB_FILE_PATH, (err) => {
      if (err) {
        console.error('Error creating the database:', err.message);
      } else {
        console.log('Database created and connected.');

        // Create tables
        createTables();

        // Insert generated data into the 'products' table
        insertGeneratedData();
      }
    });
  }
}

function createTables() {
  // Create the 'products' table if it doesn't exist
  database.run(`
    CREATE TABLE IF NOT EXISTS products (
      productId INT PRIMARY KEY,
      productName TEXT,
      price REAL,
      qtyLeft INTEGER,
      itemsSold INTEGER,
      discount REAL,
      gst REAL,
      finalPrice REAL
    )
  `);
  database.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT
  )
  `);
}

function insertGeneratedData() {
  // Generate data for products and insert it into the 'products' table
  const generatedData = generateProductData();

  // Insert the generated data into the 'products' table
  generatedData.forEach((product) => {
    const { productId, productName, price, qtyLeft, itemsSold, discount, gst ,finalPrice} = product;
    database.run(
      'INSERT INTO products (productId, productName, price, qtyLeft, itemsSold, discount, gst,finalPrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [productId, productName, price, qtyLeft, itemsSold, discount, gst, finalPrice],
      (err) => {
        if (err) {
          console.error('Error inserting data into the products table:', err.message);
        } else {
          console.log('Generated data inserted into the products table.');
        }
      }
    );
  });
}

function generateProductData() {

    const startProductId = 1315171214160;
    const endProductId = 1315171214200;
    const generatedData = [];
    for (let productId = 1315171214160; productId <= 1315171214200; productId++) {
        const productName = `Product ${productId}`;
        const price = Math.floor(Math.random() * 100000) + 1; // Random price between 1 and 100
        const qtyLeft = Math.floor(Math.random() * 1000) + 1; // Random quantity between 1 and 1000
        const itemsSold = Math.floor(Math.random() * 1000); // Random number of items sold between 0 and 1000
        const discount = Math.floor(Math.random() * 10) + 1; // Random discount between 1 and 10
        const gst = Math.floor(Math.random() * 5) + 1; 
        const finalPrice = calculateFinalPrice(price, discount, gst);
    
        generatedData.push({
        productId,
        productName,
        price,
        qtyLeft,
        itemsSold,
        discount,
        gst,
        finalPrice
        });
  }

  return generatedData;
}
function calculateFinalPrice(price, discount, gst) {
    const discountedPrice = price - (price * discount) / 100;
    const gstAmount = (discountedPrice * gst) / 100;
    return discountedPrice + gstAmount;
  }
function getProductById(productId) {
    return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(DB_FILE_PATH, (err) => {
        if (err) {
        reject(err);
        } else {
        const sql = 'SELECT * FROM products WHERE productId = ?';
        database.get(sql, [productId], (err, row) => {
            if (err) {
            reject(err);
            } else {
            resolve(row);
            }
            database.close();
        });
        }
    });
    });
}

function updateProductQuantities(productId, newQuantityLeft, newItemsSold) {
    return new Promise((resolve, reject) => {
      const database = new sqlite3.Database(DB_FILE_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          const sql = 'UPDATE products SET qtyLeft = ?, itemsSold = ? WHERE productId = ?';
          database.run(sql, [newQuantityLeft, newItemsSold, productId], (err) => {
            if (err) {
              reject(err);
            } else {
              console.log('Product quantities updated in the database:', productId);
              resolve();
            }
            database.close();
          });
        }
      });
    });
  }

  function registerUser(username, password) {
    return new Promise((resolve, reject) => {
      const database = new sqlite3.Database(DB_FILE_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
          database.run(sql, [username, password], (err) => {
            if (err) {
              reject(err);
            } else {
              console.log('User registered successfully:', username);
              resolve();
            }
            database.close();
          });
        }
      });
    });
  }
  
//   function authenticateUser(username, password) {
//     return new Promise((resolve, reject) => {
//       const database = new sqlite3.Database(DB_FILE_PATH, (err) => {
//         if (err) {
//           reject(err);
//         } else {
//           const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
//           database.get(sql, [username, password], (err, row) => {
//             if (err) {
//               reject(err);
//             } else {
//               if (row) {
//                 console.log('User authenticated successfully:', username);
//                 resolve();
//               } else {
//                 reject(new Error('Invalid username or password.'));
//               }
//             }
//             database.close();
//           });
//         }
//       });
//     });
//   }
function checkUserExists(username) {
    console.log(username);
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_FILE_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          const sql = 'SELECT username FROM users WHERE username = ?';
          db.get(sql, [username], (err, row) => {
            if (err) {
              reject(err);
              db.close();
            } else {
              // If the row is not null, the username exists
              console.log(row)
              const userExists = typeof row === 'object';
              console.log('dbmanager',userExists);
              db.close();
              //return userExists
              resolve(userExists);
            
            }
            
          });
        }
      });
    });
  }
  
  
  // Save user information in the database (including password hashing)
  async function saveUser(username, password) {
    console.log('save',username, password)
    const hashedPassword =  await bcrypt.hash(password, 10);
    console.log('hased_beg',hashedPassword)
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_FILE_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
          db.run(sql, [username, hashedPassword], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
            db.close();
          });
        }
      });
    });
  }
  
  // Authenticate user during login
  async function authenticateUser(username, password) {
    console.log('authenticate',username,password)
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_FILE_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          const sql = 'SELECT password FROM users WHERE username = ?';
          db.get(sql, [username],  (err, row) => {
            if (err) {
              reject(err);
            } else {
              if (!row) {
                console.log('error',row)
                resolve(false); // User not found
              } else {
                
                const hashedPassword = row.password;
                console.log('hased',hashedPassword);
                
                // console.log('passed',c_password)
                comparePasswords(password, row.password)
                .then((isMatch) => resolve(isMatch))
                .catch((error) => reject(error));
              }
              db.close();
            }
          });
        }
      });
    });
  }
  async function comparePasswords(password, hashedPassword) {
    try {
    //   const c_password=await bcrypt.hash(password, 10)
    //   console.log('passed',c_password)
      const isMatch = await bcrypt.compare(password, hashedPassword);
      console.log(isMatch)
      return isMatch;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
  function getInventoryData() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_FILE_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          const sql = 'SELECT * FROM products';
          db.all(sql, (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
            db.close();
          });
        }
      });
    });
  }

  function getTopItemsSold(limit) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT productName,itemsSold FROM products ORDER BY itemsSold DESC LIMIT ?';
      database.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  function getLeastItemsSold(limit) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT productName,itemsSold FROM products ORDER BY itemsSold ASC LIMIT ?';
      database.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  function getLowStockItems() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT productId,productName,qtyLeft FROM products WHERE qtyLeft <= ?';
      database.all(sql, [50], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
module.exports = {
  initializeDatabase,
  getProductById,
  updateProductQuantities,
  registerUser,
  authenticateUser,
  saveUser,
  checkUserExists,
  getInventoryData,
  getTopItemsSold,
  getLeastItemsSold,
  getLowStockItems,
};
