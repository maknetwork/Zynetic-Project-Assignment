import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('meter_telemetry_history')
@Index(['meterId', 'recordedAt'])
export class MeterHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'meter_id', type: 'varchar', length: 50 })
  @Index()
  meterId: string;

  @Column({ name: 'kwh_consumed_ac', type: 'decimal', precision: 10, scale: 2 })
  kwhConsumedAc: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  voltage: number;

  @Column({ name: 'recorded_at', type: 'timestamp with time zone' })
  @Index()
  recordedAt: Date;

  @CreateDateColumn({ name: 'ingested_at', type: 'timestamp with time zone' })
  ingestedAt: Date;
}
