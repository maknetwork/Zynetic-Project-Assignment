import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MeterReadingDto } from '../dto/meter-reading.dto';
import { MeterCurrent } from '../entities/meter-current.entity';
import { MeterHistory } from '../entities/meter-history.entity';

@Injectable()
export class MeterHandlerService {
  private readonly logger = new Logger(MeterHandlerService.name);

  constructor(
    @InjectRepository(MeterCurrent)
    private meterCurrentRepo: Repository<MeterCurrent>,
    @InjectRepository(MeterHistory)
    private meterHistoryRepo: Repository<MeterHistory>,
    private dataSource: DataSource,
  ) {}

  async processMeterReading(reading: MeterReadingDto): Promise<void> {
    const recordedAt = new Date(reading.timestamp);

    // Dual-write pattern using transaction
    await this.dataSource.transaction(async (manager) => {
      // Write 1: Insert into history table (append-only)
      await manager.insert(MeterHistory, {
        meterId: reading.meterId,
        kwhConsumedAc: reading.kwhConsumedAc,
        voltage: reading.voltage,
        recordedAt,
      });

      // Write 2: Upsert into current state table
      await manager.upsert(
        MeterCurrent,
        {
          meterId: reading.meterId,
          kwhConsumedAc: reading.kwhConsumedAc,
          voltage: reading.voltage,
          lastUpdatedAt: recordedAt,
        },
        {
          conflictPaths: ['meterId'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    });

    this.logger.log(`Processed meter reading for ${reading.meterId}`);
  }
}
