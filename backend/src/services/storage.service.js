import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class StorageService {
  constructor() {
    this.isConfigured = Boolean(
      env.CLOUDINARY.CLOUD_NAME &&
      env.CLOUDINARY.API_KEY &&
      env.CLOUDINARY.API_SECRET
    );

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY.CLOUD_NAME,
        api_key: env.CLOUDINARY.API_KEY,
        api_secret: env.CLOUDINARY.API_SECRET,
        secure: true,
      });
      logger.info('Cloudinary storage service initialized successfully.');
    } else {
      logger.warn('Cloudinary credentials not provided in .env - Running in local/URL mode.');
    }
  }

  /**
   * Upload an image base64 / buffer / data URI to Cloudinary
   */
  async uploadImage(fileData, { folder = 'meflow_proofs', publicId = null } = {}) {
    if (!this.isConfigured) {
      logger.warn('Cloudinary upload called without API credentials. Simulating storage.');
      return {
        url: typeof fileData === 'string' && fileData.startsWith('http') ? fileData : `https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80`,
        publicId: publicId || `simulated_${Date.now()}`,
        simulated: true,
      };
    }

    try {
      const uploadOptions = {
        folder,
        resource_type: 'image',
        ...(publicId && { public_id: publicId }),
      };

      const result = await cloudinary.uploader.upload(fileData, uploadOptions);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
        simulated: false,
      };
    } catch (error) {
      logger.error('Cloudinary upload failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate signed upload parameters for direct client-to-Cloudinary uploads
   */
  generateUploadSignature(folder = 'meflow_proofs') {
    if (!this.isConfigured) {
      return {
        configured: false,
        message: 'Cloudinary credentials missing in .env. Use direct URLs or notes.',
      };
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      env.CLOUDINARY.API_SECRET
    );

    return {
      configured: true,
      timestamp,
      signature,
      apiKey: env.CLOUDINARY.API_KEY,
      cloudName: env.CLOUDINARY.CLOUD_NAME,
      folder,
    };
  }
}

export const storageService = new StorageService();

