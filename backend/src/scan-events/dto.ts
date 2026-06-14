import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class PushScanDto {
  @ApiProperty({ description: "Client-generated UUID for idempotency" })
  @IsString()
  @MaxLength(64)
  eventId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(512)
  rawBarcode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  flightNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pnr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passengerName?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(32)
  resultStatus!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ example: "2026-06-12T08:30:00.000Z" })
  @IsDateString()
  scannedAt!: string;

  @ApiProperty({ example: "CGK-T3" })
  @IsString()
  @MaxLength(32)
  station!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ktpStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ktpName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ktpSimilarity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ktpCapturedAt?: string;
}

export class ListScansQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  station?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  flightNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  perPage?: number;
}
