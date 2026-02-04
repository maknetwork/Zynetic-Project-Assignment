import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vehicles_current')
export class VehicleCurrent {
  @PrimaryColumn({ name: 'vehicle_id', type: 'varchar', length: 50 })
  vehicleId: string;

  @Column({ type: 'int' })
  soc: number;

  @Column({ name: 'kwh_delivered_dc', type: 'decimal', precision: 10, scale: 2 })
  kwhDeliveredDc: number;

  @Column({ name: 'battery_temp', type: 'decimal', precision: 5, scale: 2 })
  batteryTemp: number;

  @Column({ name: 'charging_status', type: 'varchar', length: 20, default: 'ACTIVE' })
  chargingStatus: string;

  @UpdateDateColumn({ name: 'last_updated_at', type: 'timestamp with time zone' })
  lastUpdatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
