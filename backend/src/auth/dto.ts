import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "operator@afvs.local" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "ChangeMe!2026" })
  @IsString()
  @MinLength(8)
  password!: string;
}
