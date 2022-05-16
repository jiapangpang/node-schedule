// import { default as http } from "./utils/httpGet.js";
import sendEmail from "./utils/email.js";
import DDNS from "./utils/resetDns.js";
import axios from "axios";
import {ToadScheduler, SimpleIntervalJob, Task } from 'toad-scheduler'
// const a = require("./ip.json");
var log4js = require("log4js");
const fs = require("fs");

//log4js 设置
log4js.configure({
  appenders: {
    fileOut: { type: "file", filename: "./log/fileOut.log" },
    dataFileOut: {
      type: "dateFile",
      filename: "./log/dataFileOut.log",
      pattern: ".yyyy-MM-dd",
      daysToKeep: 15,
    },
    consoleOut: { type: "console" },
  },
  categories: {
    default: { appenders: ["fileOut", "consoleOut"], level: "debug" },
    ip: { appenders: ["dataFileOut"], level: "debug" },
    // anything: { appenders: ["consoleout"], level: "debug" },
  },
});
let logger = log4js.getLogger("ip");
let options = JSON.parse(fs.readFileSync("./ddns.json", "utf-8"));

function recordIp(newIp, oldIp) {
  if (newIp !== oldIp) {
    logger.info(`now ip->${newIp}`);
    DDNS(options, newIp)
      .then((res) => {
        fs.writeFileSync(
          "./ip.json",
          JSON.stringify({ ip: newIp || "127.0.0.1" })
        );
        logger.info(`change cloudFare`);
      })
      .catch((e) => {
        logger.warn(`change cloudFare Failed:${JSON.stringify(e)}`);
        sendEmail(newIp);
      });
  }
  logger.info("ip no change");
}
function runDaily(){
  try {
    let { ip: oldIp } = JSON.parse(fs.readFileSync("./ip.json", "utf-8"));
    // import a from "./ip.json";
  
    axios
      .get("http://ip-api.com/json", { timeout: 5000 })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          const newIp = res.data.query;
          recordIp(newIp, oldIp);
        } else {
          throw new Error(`responseStatus:${res.status}`);
        }
      })
      .catch((e) => {
        logger.warn(`some bad:${e}`);
      });
  
    // http("http://ip-api.com/json",2000)
    //   .then((res) => {
    //     const newIp = res.query;
    //     recordIp(newIp, oldIp);
    //   })
    //   .catch((e) => {
    //     logger.warn(`some bad:${e}`);
    //   });
  } catch (e) {
    logger.warn(`some bad:${e}`);
  }
}
const scheduler = new ToadScheduler()

const task = new Task('simple task', runDaily)
const job = new SimpleIntervalJob({ minutes: 15,runImmediately:true}, task)
scheduler.addSimpleIntervalJob(job)

