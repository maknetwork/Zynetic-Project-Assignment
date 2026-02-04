import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('meters_current')
export class MeterCurrent {
  @PrimaryColumn({ name: 'meter_id', type: 'varchar', length: 50 })
  meterId: string;

  @Column({ name: 'kwh_consumed_ac', type: 'decimal', precision: 10, scale: 2 })
  kwhConsumedAc: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  voltage: number;

  @UpdateDateColumn({ name: 'last_updated_at', type: 'timestamp with time zone' })
  lastUpdatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
