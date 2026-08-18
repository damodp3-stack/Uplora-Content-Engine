import { ImageQualityValidatorService } from "./image-quality-validator.service";
import { BadRequestException } from "@nestjs/common";

describe("ImageQualityValidatorService", () => {
  let validator: ImageQualityValidatorService;

  beforeEach(() => {
    validator = new ImageQualityValidatorService();
  });

  it("should validate valid PNG image binary buffer and compute SHA-256 checksum", () => {
    // 24-byte PNG header buffer
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x03, 0x00, // width: 768
      0x00, 0x00, 0x05, 0x40, // height: 1344
    ]);

    const result = validator.validateImage(pngBuffer);

    expect(result.isValid).toBe(true);
    expect(result.mimeType).toBe("image/png");
    expect(result.width).toBe(768);
    expect(result.height).toBe(1344);
    expect(result.checksum).toBeDefined();
  });

  it("should throw BadRequestException if binary buffer is empty", () => {
    expect(() => validator.validateImage(Buffer.alloc(0))).toThrow(
      BadRequestException,
    );
  });
});
