import { Injectable } from "@nestjs/common";

@Injectable()
export class MediaService {
  async getMediaLibrary(workspaceId: string) {
    return [
      {
        id: "med-1",
        filename: "content-banner-ai.png",
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
        mimeType: "image/png",
        size: 1420500,
        createdAt: new Date(),
      },
      {
        id: "med-2",
        filename: "social-infographic-2026.png",
        url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80",
        mimeType: "image/png",
        size: 2104200,
        createdAt: new Date(),
      },
      {
        id: "med-3",
        filename: "header-background.jpg",
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
        mimeType: "image/jpeg",
        size: 984000,
        createdAt: new Date(),
      },
    ];
  }

  async uploadMedia(file: any, workspaceId: string) {
    return {
      id: `med_${Date.now()}`,
      filename: file?.originalname || "uploaded-file.png",
      url: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80`,
      size: file?.size || 102400,
      createdAt: new Date(),
    };
  }
}
