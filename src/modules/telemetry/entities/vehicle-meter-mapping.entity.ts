import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('vehicle_meter_mapping')
export class VehicleMeterMapping {
  @PrimaryColumn({ name: 'vehicle_id', type: 'varchar', length: 50 })
  vehicleId: string;

  @Column({ name: 'meter_id', type: 'varchar', length: 50 })
  meterId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @CreateDateColumn({ name: 'installation_date', type: 'timestamp with time zone' })
  installationDate: Date;
}
