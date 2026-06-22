import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtPayload } from "../auth/auth.service";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/roles.decorator";
import {
  CreateOperatorDto,
  ListOperatorsQuery,
  SetPinDto,
  UpdateOperatorDto,
} from "./dto";
import { OperatorsService } from "./operators.service";

@ApiTags("operators")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@Controller("operators")
export class OperatorsController {
  constructor(private svc: OperatorsService) {}

  @Get()
  list(@Query() q: ListOperatorsQuery) {
    return this.svc.list(q);
  }

  @Post()
  create(@Body() dto: CreateOperatorDto) {
    return this.svc.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateOperatorDto) {
    return this.svc.update(id, dto);
  }

  @Post(":id/pin")
  setPin(@Param("id") id: string, @Body() dto: SetPinDto) {
    return this.svc.setPin(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: { user: JwtPayload }) {
    return this.svc.remove(id, req.user.sub);
  }
}
