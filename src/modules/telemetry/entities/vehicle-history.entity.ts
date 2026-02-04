import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('vehicle_telemetry_history')
@Index(['vehicleId', 'recordedAt'])
export class VehicleHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'vehicle_id', type: 'varchar', length: 50 })
  @Index()
  vehicleId: string;

  @Column({ type: 'int' })
  soc: number;

  @Column({ name: 'kwh_delivered_dc', type: 'decimal', precision: 10, scale: 2 })
  kwhDeliveredDc: number;

  @Column({ name: 'battery_temp', type: 'decimal', precision: 5, scale: 2 })
  batteryTemp: number;

  @Column({ name: 'recorded_at', type: 'timestamp with time zone' })
  @Index()
  recordedAt: Date;

  @CreateDateColumn({ name: 'ingested_at', type: 'timestamp with time zone' })
  ingestedAt: Date;
}
