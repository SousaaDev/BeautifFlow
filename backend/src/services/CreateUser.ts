import { User } from '../models/User';
import { UserRepository } from '../models/UserRepository';

export class CreateUser {
  constructor(private userRepository: UserRepository) {}

  async execute(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const existing = await this.userRepository.findByEmail(userData.email);
    if (existing) {
      throw new Error('Email already registered');
    }

    return this.userRepository.create(userData);
  }
}
