import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { HashingProvider } from "./hashing-services";

@Injectable()
export class BcryptProvider implements HashingProvider {
  async hashPassword(password: string | Buffer): Promise<string> {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
  }
  // compare
  public comparePassword(
    data: string | Buffer,
    encrypted: string,
  ): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
