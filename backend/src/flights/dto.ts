import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FlightStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateFlightDto {
  @ApiProperty({ example: "QG432" })
  @IsString()
  @MaxLength(16)
  flightNumber!: string;

  @ApiProperty({ example: "QG" })
  @IsString()
  @MaxLength(4)
  airlineCode!: string;

  @ApiProperty({ example: "SRG" })
  @IsString()
  @MaxLength(8)
  origin!: string;

  @ApiProperty({ example: "CGK" })
  @IsString()
  @MaxLength(8)
  destination!: string;

  @ApiProperty({ example: "2026-06-12T08:30:00.000Z" })
  @IsDateString()
  std!: string;

  @ApiProperty({ enum: FlightStatus, example: FlightStatus.SCHEDULED })
  @IsEnum(FlightStatus)
  status!: FlightStatus;

  @ApiProperty({ example: "CGK-T3" })
  @IsString()
  @MaxLength(32)
  station!: string;
}

export class UpdateFlightDto {
  @ApiPropertyOptional({ enum: FlightStatus })
  @IsOptional()
  @IsEnum(FlightStatus)
  status?: FlightStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  std?: string;
}

export class ListFlightsQuery {
  @ApiPropertyOptional({ example: "CGK-T3" })
  @IsOptional()
  @IsString()
  station?: string;

  @ApiPropertyOptional({ example: "2026-06-12" })
  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @ApiPropertyOptional({ enum: FlightStatus })
  @IsOptional()
  @IsEnum(FlightStatus)
  status?: FlightStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  perPage?: number;
}
