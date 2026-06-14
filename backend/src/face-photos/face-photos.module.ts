import { Module } from "@nestjs/common";
import { FacePhotosController } from "./face-photos.controller";

@Module({
  controllers: [FacePhotosController],
})
export class FacePhotosModule {}
