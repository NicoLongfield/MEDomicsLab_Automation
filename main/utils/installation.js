import { app } from "electron"
import { execCallbacksForChildWithNotifications } from "../utils/pythonEnv"
import { mainWindow, getMongoDBPath } from "../background"
var path = require("path")
const util = require("util")
const exec = util.promisify(require("child_process").exec)

export const installMongoDB = async () => {
    if (process.platform === "win32") {
        // Download MongoDB installer
        const downloadUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.12-signed.msi"
        const downloadPath = path.join(app.getPath("downloads"), "mongodb-windows-x86_64-7.0.12-signed.msi")
        let downloadMongoDBPromise = exec(`curl -o ${downloadPath} ${downloadUrl}`)
        execCallbacksForChildWithNotifications(downloadMongoDBPromise.child, "Downloading MongoDB installer", mainWindow)
        await downloadMongoDBPromise
        // Install MongoDB
        // msiexec.exe /l*v mdbinstall.log /qb /i mongodb-windows-x86_64-7.0.12-signed.msi ADDLOCAL="ServerNoService" SHOULD_INSTALL_COMPASS="0"
        let installMongoDBPromise = exec(`msiexec.exe /l*v mdbinstall.log /qb /i ${downloadPath} ADDLOCAL="ServerNoService" SHOULD_INSTALL_COMPASS="0"`)
        execCallbacksForChildWithNotifications(installMongoDBPromise.child, "Installing MongoDB", mainWindow)
        await installMongoDBPromise

        return getMongoDBPath() !== null
    }
}


