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
  CreateFlightDto,
  ListFlightsQuery,
  SyncFlightsDto,
  UpdateFlightDto,
} from "./dto";
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

  // Rekap penumpang per maskapai (agregat manifest). `date` atau `from`+`to`.
  // Path statis DIDAHULUKAN sebelum ":id/passengers" agar tak tertangkap :id.
  @Get("manifests/by-airline")
  manifestByAirline(
    @Req() req: { user: JwtPayload },
    @Query() q: { date?: string; from?: string; to?: string; detail?: string },
  ) {
    return this.svc.manifestByAirline(q, req.user);
  }

  // Manifest penumpang sebuah flight (diisi dari scan VALID). Semua petugas
  // terautentikasi; scoping per-station/role diterapkan di service (F-05).
  @Get(":id/passengers")
  passengers(
    @Req() req: { user: JwtPayload },
    @Param("id") id: string,
  ) {
    return this.svc.listPassengers(id, req.user);
  }

  // Backfill/rebuild manifest dari ScanEvent historis (idempotent). Admin only.
  @Post("manifests/rebuild")
  @Roles("admin")
  rebuildManifests(@Query("date") date?: string) {
    return this.svc.rebuildManifests(date);
  }

  @Post()
  @Roles("admin", "supervisor")
  create(@Body() dto: CreateFlightDto) {
    return this.svc.create(dto);
  }

  // Snapshot jadwal harian (tarik FIDS) — upsert massal, idempotent.
  // Dibuka utk semua petugas terautentikasi karena ini sinkronisasi data
  // (idempotent, tak menghapus), bukan manajemen jadwal manual.
  @Post("sync")
  @Roles("admin", "supervisor", "operator")
  sync(@Body() dto: SyncFlightsDto) {
    return this.svc.bulkUpsert(dto);
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
