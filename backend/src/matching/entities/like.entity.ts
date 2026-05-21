import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Tabela de likes - registra quando um usuário curte outro
// Unique constraint garante que um usuário não pode curtir o mesmo perfil duas vezes
@Entity('likes')
@Unique(['fromUser', 'toUser'])
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.sentLikes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User;

  @Column()
  from_user_id: string;

  @ManyToOne(() => User, (user) => user.receivedLikes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_user_id' })
  toUser: User;

  @Column()
  to_user_id: string;

  // Super like indica interesse especial
  @Column({ default: false })
  isSuperLike: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
