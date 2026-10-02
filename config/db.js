const mongoose = require("mongoose");
require("dotenv").config();
// const { write_logs } = require("../winston/connection/logger");

mongoose.set("strictQuery", false);


const connectWithRetry = () => {
  return mongoose.connect(process.env.CONNECTION_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
    serverSelectionTimeoutMS: 60000,  // Timeout after 10 seconds instead of 30 seconds
    socketTimeoutMS: 120000,
    maxPoolSize: 10,
  });
  // return
};


const handleConnection = () => {
  mongoose.connection.on("connected", () => {
    // write_logs({
    //   message: "Connection established successfully",
    //   log_type: "info",
    // });
  });

  mongoose.connection.on("error", () => {
    setTimeout(connectWithRetry, 5000);
    // write_logs({
    //   message: "Mongoose connection default error",
    //   log_type: "error",
    // });
  });

  mongoose.connection.on("disconnected", () => {
    setTimeout(connectWithRetry, 5000);
    // write_logs({
    //   message: "Mongoose default connection disconnected",
    //   log_type: "info",
    // });
  });

  process.on("SIGINT", () => {
    mongoose.connection.close(() => {
      // write_logs({
      //   message: "Connection close successfully",
      //   log_type: "info",
      // });
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // write_logs({
    //   message: `Unhandled Rejection : ${JSON.stringify(reason)}`,
    //   log_type: "error",
    // });
    setTimeout(connectWithRetry, 10000);
    // Optionally restart the process or take other actions
  });

  // Catch uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // write_logs({
    //   message: `Uncaught Exception : ${JSON.stringify(error)}`,
    //   log_type: "error"
    // });
    setTimeout(connectWithRetry, 10000);
    // Optionally restart the process or take other actions
  });

  connectWithRetry().catch(err => {
    // write_logs({
    //   message: `Initial connection error: ${err}`,
    //   log_type: "error",
    // });
    setTimeout(connectWithRetry, 5000); // Wait for 5 seconds before retrying
  });

}

handleConnection();