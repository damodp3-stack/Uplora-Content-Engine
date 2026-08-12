import { registerAs } from "@nestjs/config";

export default registerAs("storage", () => ({
  driver: process.env.STORAGE_DRIVER || "local",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || "uplora-media",
  },
}));
