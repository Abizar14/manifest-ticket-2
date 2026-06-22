import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "operator@afvs.local" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "ChangeMe!2026" })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginPinDto {
  @ApiProperty({ example: "1234", description: "PIN petugas AVSEC (4-6 digit)" })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: "PIN harus 4-6 digit angka" })
  pin!: string;
}
