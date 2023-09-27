const initializeApp = require('firebase/app').initializeApp;
const firestore = require('firebase/firestore');
const BME280 = require('bme280-sensor');

// The BME280 constructor options are optional.
// 
const options = {
  i2cBusNo: 1, // defaults to 1
  i2cAddress: BME280.BME280_DEFAULT_I2C_ADDRESS() // defaults to 0x77
};

const bme280 = new BME280(options);

// Read BME280 sensor data, repeat
//
const readSensorData = () => {
  bme280.readSensorData()
    .then((data) => {
      // temperature_C, pressure_hPa, and humidity are returned by default.
      // I'll also calculate some unit conversions for display purposes.
      //
      data.temperature_F = BME280.convertCelciusToFahrenheit(data.temperature_C);
      data.pressure_inHg = BME280.convertHectopascalToInchesOfMercury(data.pressure_hPa);
      data.dateTimeCreated = firestore.Timestamp.fromDate(new Date());

      console.log(`data = ${JSON.stringify(data, null, 2)}`);
      writeDataToFirebase(data);
      setTimeout(readSensorData, 20000);
    })
    .catch((err) => {
      console.log(`BME280 read error: ${err}`);
      setTimeout(readSensorData, 2000);
    });
};

/**
 * Records each reading from the humidity/pressure/temp sensor to Google
 * Firestore cloud database.
 * @async
 * @param {Object} data - Data read from sensor & timestamp.
 */
const writeDataToFirebase = async (data) => {
  // See: https://support.google.com/firebase/answer/7015592
  // Your web app's Firebase configuration
  const firebaseConfig = require('./config.json');
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);


  // Initialize Cloud Firestore and get a reference to the service
  const db = firestore.getFirestore(app);

  try {
    const docRef = await firestore.addDoc(firestore.collection(db, "HPT_Readings"), data);
    console.log("Document written: ", JSON.stringify(docRef));
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

// Initialize the BME280 sensor
//
bme280.init()
  .then(() => {
    console.log('BME280 initialization succeeded');
    readSensorData();
  })
  .catch((err) => console.error(`BME280 initialization failed: ${err} `));