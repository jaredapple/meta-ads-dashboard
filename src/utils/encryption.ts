import * as crypto from 'crypto';

// Encryption utilities for securing sensitive data like access tokens

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private tagLength = 16; // 128 bits
  private saltLength = 64; // 512 bits
  private iterations = 100000;
  
  private encryptionKey: Buffer;

  constructor(masterKey?: string) {
    // Use provided key or fall back to environment variable
    const key = masterKey || process.env.ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('Encryption key is required. Set ENCRYPTION_KEY environment variable.');
    }

    // Derive a proper encryption key from the master key
    const salt = crypto.createHash('sha256').update('meta-mcp-salt').digest();
    this.encryptionKey = crypto.pbkdf2Sync(key, salt, this.iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypts a string value
   * @param plaintext The string to encrypt
   * @returns Base64 encoded encrypted string with IV and auth tag
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return '';
    }

    // Generate random IV
    const iv = crypto.randomBytes(this.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    // Encrypt the plaintext
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    // Return base64 encoded
    return combined.toString('base64');
  }

  /**
   * Decrypts a string value
   * @param encryptedData Base64 encoded encrypted string
   * @returns Decrypted plaintext string
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) {
      return '';
    }

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Failed to decrypt data: ${(error as Error).message}`);
    }
  }

  /**
   * Generates a secure random encryption key
   * @returns A base64 encoded random key suitable for ENCRYPTION_KEY env variable
   */
  static generateKey(): string {
    return crypto.randomBytes(64).toString('base64');
  }

  /**
   * Hashes a value for secure comparison (e.g., API keys)
   * @param value The value to hash
   * @returns SHA-256 hash of the value
   */
  static hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

// Singleton instance for convenience
let encryptionInstance: EncryptionService | null = null;

export function getEncryption(): EncryptionService {
  if (!encryptionInstance) {
    encryptionInstance = new EncryptionService();
  }
  return encryptionInstance;
}

// Helper functions for common use cases
export function encryptToken(token: string): string {
  return getEncryption().encrypt(token);
}

export function decryptToken(encryptedToken: string): string {
  return getEncryption().decrypt(encryptedToken);
}