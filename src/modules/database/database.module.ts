import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MeterCurrent } from '../telemetry/entities/meter-current.entity';
import { MeterHistory } from '../telemetry/entities/meter-history.entity';
import { VehicleCurrent } from '../telemetry/entities/vehicle-current.entity';
import { VehicleHistory } from '../telemetry/entities/vehicle-history.entity';
import { VehicleMeterMapping } from '../telemetry/entities/vehicle-meter-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [MeterCurrent, MeterHistory, VehicleCurrent, VehicleHistory, VehicleMeterMapping],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
        extra: {
          max: configService.get<number>('DB_POOL_MAX') || 50,
          min: configService.get<number>('DB_POOL_MIN') || 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {
  constructor(private dataSource: DataSource) {}

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
