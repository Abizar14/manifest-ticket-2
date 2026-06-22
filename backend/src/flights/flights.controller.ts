import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CreateFlightDto, ListFlightsQuery, UpdateFlightDto } from "./dto";
import { FlightsService } from "./flights.service";

@ApiTags("flights")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("flights")
export class FlightsController {
  constructor(private svc: FlightsService) {}

  @Get()
  list(@Query() q: ListFlightsQuery) {
    return this.svc.list(q);
  }

  @Post()
  @Roles("admin", "supervisor")
  create(@Body() dto: CreateFlightDto) {
    return this.svc.create(dto);
  }

  @Patch(":id")
  @Roles("admin", "supervisor")
  update(@Param("id") id: string, @Body() dto: UpdateFlightDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
