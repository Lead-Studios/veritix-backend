import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationModel, ModelType, ModelStatus } from '../entities/recommendation-model.entity';
import { UserInteraction } from '../entities/user-interaction.entity';
import { UserPreference } from '../entities/user-preference.entity';
import * as tf from '@tensorflow/tfjs-node';

export interface TrainingData {
  userId: string;
  eventId: string;
  features: number[];
  label: number; // 1 for positive interaction, 0 for negative
}

export interface ModelTrainingConfig {
  modelType: ModelType;
  hyperparameters: Record<string, any>;
  trainingRatio: number;
  validationRatio: number;
  epochs: number;
  batchSize: number;
}

@Injectable()
export class MLTrainingService {
  constructor(
    @InjectRepository(RecommendationModel)
    private modelRepository: Repository<RecommendationModel>,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    @InjectRepository(UserPreference)
    private preferenceRepository: Repository<UserPreference>,
  ) {}

  async trainCollaborativeFilteringModel(config: ModelTrainingConfig): Promise<RecommendationModel> {
    const modelRecord = await this.createModelRecord(config);

    try {
      // Prepare training data
      const trainingData = await this.prepareCollaborativeFilteringData();
      
      if (trainingData.length < 1000) {
        throw new Error('Insufficient training data. Need at least 1000 interactions.');
      }

      // Create TensorFlow model
      const model = this.createCollaborativeFilteringModel(config.hyperparameters);

      // Train the model
      const { trainX, trainY, testX, testY } = this.splitTrainingData(trainingData, config);
      
      await model.fit(trainX, trainY, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationData: [testX, testY],
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch}: loss = ${logs.loss}, accuracy = ${logs.acc}`);
          },
        },
      });

      // Evaluate model
      const evaluation = await this.evaluateModel(model, testX, testY);

      // Save model
      const modelPath = await this.saveModel(model, modelRecord.id);

      // Update model record
      await this.modelRepository.update(modelRecord.id, {
        status: ModelStatus.READY,
        accuracy: evaluation.accuracy,
        precision: evaluation.precision,
        recall: evaluation.recall,
        f1Score: evaluation.f1Score,
        modelPath,
        trainedAt: new Date(),
        trainingDataSize: trainingData.length,
        testDataSize: testY.shape[0],
      });

      return this.modelRepository.findOne({ where: { id: modelRecord.id } });
    } catch (error) {
      await this.modelRepository.update(modelRecord.id, {
        status: ModelStatus.FAILED,
      });
      throw error;
    }
  }

  async trainContentBasedModel(config: ModelTrainingConfig): Promise<RecommendationModel> {
    const modelRecord = await this.createModelRecord(config);

    try {
      // Prepare content-based training data
      const trainingData = await this.prepareContentBasedData();
      
      // Create neural network for content-based filtering
      const model = this.createContentBasedModel(config.hyperparameters);

      // Train the model
      const { trainX, trainY, testX, testY } = this.splitTrainingData(trainingData, config);
      
      await model.fit(trainX, trainY, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationData: [testX, testY],
      });

      // Evaluate and save
      const evaluation = await this.evaluateModel(model, testX, testY);
      const modelPath = await this.saveModel(model, modelRecord.id);

      await this.modelRepository.update(modelRecord.id, {
        status: ModelStatus.READY,
        accuracy: evaluation.accuracy,
        precision: evaluation.precision,
        recall: evaluation.recall,
        f1Score: evaluation.f1Score,
        modelPath,
        trainedAt: new Date(),
        trainingDataSize: trainingData.length,
      });

      return this.modelRepository.findOne({ where: { id: modelRecord.id } });
    } catch (error) {
      await this.modelRepository.update(modelRecord.id, {
        status: ModelStatus.FAILED,
      });
      throw error;
    }
  }

  async trainHybridModel(config: ModelTrainingConfig): Promise<RecommendationModel> {
    const modelRecord = await this.createModelRecord(config);

    try {
      // Combine collaborative and content-based features
      const collaborativeData = await this.prepareCollaborativeFilteringData();
      const contentData = await this.prepareContentBasedData();
      
      const hybridData = this.combineTrainingData(collaborativeData, contentData);

      // Create hybrid neural network
      const model = this.createHybridModel(config.hyperparameters);

      // Train the model
      const { trainX, trainY, testX, testY } = this.splitTrainingData(hybridData, config);
      
      await model.fit(trainX, trainY, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationData: [testX, testY],
      });

      // Evaluate and save
      const evaluation = await this.evaluateModel(model, testX, testY);
      const modelPath = await this.saveModel(model, modelRecord.id);

      await this.modelRepository.update(modelRecord.id, {
        status: ModelStatus.READY,
        accuracy: evaluation.accuracy,
        precision: evaluation.precision,
        recall: evaluation.recall,
        f1Score: evaluation.f1Score,
        modelPath,
        trainedAt: new Date(),
        trainingDataSize: hybridData.length,
      });

      return this.modelRepository.findOne({ where: { id: modelRecord.id } });
    } catch (error) {
      await this.modelRepository.update(modelRecord.id, {
        status: ModelStatus.FAILED,
      });
      throw error;
    }
  }

  private async createModelRecord(config: ModelTrainingConfig): Promise<RecommendationModel> {
    const model = this.modelRepository.create({
      name: `${config.modelType}_${Date.now()}`,
      modelType: config.modelType,
      version: '1.0.0',
      status: ModelStatus.TRAINING,
      hyperparameters: config.hyperparameters,
      trainingConfig: config,
    });

    return this.modelRepository.save(model);
  }

  private async prepareCollaborativeFilteringData(): Promise<TrainingData[]> {
    // Get user-event interaction matrix
    const interactions = await this.interactionRepository
      .createQueryBuilder('interaction')
      .where('interaction.eventId IS NOT NULL')
      .andWhere('interaction.weight > 0')
      .getMany();

    const trainingData: TrainingData[] = [];
    const userEventMap = new Map<string, Set<string>>();

    // Build user-event interaction map
    for (const interaction of interactions) {
      const key = interaction.userId;
      if (!userEventMap.has(key)) {
        userEventMap.set(key, new Set());
      }
      userEventMap.get(key).add(interaction.eventId);
    }

    // Generate positive and negative samples
    const allUsers = Array.from(userEventMap.keys());
    const allEvents = Array.from(new Set(interactions.map(i => i.eventId)));

    for (const userId of allUsers) {
      const userEvents = userEventMap.get(userId);
      
      // Positive samples
      for (const eventId of userEvents) {
        const features = await this.extractCollaborativeFeatures(userId, eventId);
        trainingData.push({
          userId,
          eventId,
          features,
          label: 1,
        });
      }

      // Negative samples (random sampling)
      const negativeEvents = allEvents.filter(eventId => !userEvents.has(eventId));
      const numNegative = Math.min(userEvents.size, negativeEvents.length);
      
      for (let i = 0; i < numNegative; i++) {
        const randomEvent = negativeEvents[Math.floor(Math.random() * negativeEvents.length)];
        const features = await this.extractCollaborativeFeatures(userId, randomEvent);
        trainingData.push({
          userId,
          eventId: randomEvent,
          features,
          label: 0,
        });
      }
    }

    return trainingData;
  }

  private async prepareContentBasedData(): Promise<TrainingData[]> {
    // Similar to collaborative but focus on content features
    const interactions = await this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.event', 'event')
      .where('interaction.eventId IS NOT NULL')
      .getMany();

    const trainingData: TrainingData[] = [];

    for (const interaction of interactions) {
      const features = await this.extractContentFeatures(interaction.userId, interaction.eventId);
      const label = interaction.weight > 2 ? 1 : 0; // Positive if significant interaction
      
      trainingData.push({
        userId: interaction.userId,
        eventId: interaction.eventId,
        features,
        label,
      });
    }

    return trainingData;
  }

  private async extractCollaborativeFeatures(userId: string, eventId: string): Promise<number[]> {
    // Extract features for collaborative filtering
    const features: number[] = [];

    // User activity level
    const userInteractionCount = await this.interactionRepository.count({
      where: { userId },
    });
    features.push(Math.log(userInteractionCount + 1));

    // Event popularity
    const eventInteractionCount = await this.interactionRepository.count({
      where: { eventId },
    });
    features.push(Math.log(eventInteractionCount + 1));

    // User-event interaction history
    const existingInteraction = await this.interactionRepository.findOne({
      where: { userId, eventId },
    });
    features.push(existingInteraction ? existingInteraction.weight : 0);

    return features;
  }

  private async extractContentFeatures(userId: string, eventId: string): Promise<number[]> {
    // Extract content-based features
    const features: number[] = [];

    // User preferences
    const preferences = await this.preferenceRepository.find({
      where: { userId, isActive: true },
    });

    // Create preference vector (simplified)
    const prefVector = new Array(20).fill(0);
    for (const pref of preferences) {
      const index = this.getPreferenceIndex(pref.preferenceType, pref.preferenceValue);
      if (index < 20) {
        prefVector[index] = pref.weight;
      }
    }

    features.push(...prefVector);

    return features;
  }

  private getPreferenceIndex(type: string, value: string): number {
    // Simple hash function to map preferences to indices
    const combined = `${type}:${value}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) & 0x7fffffff;
    }
    return hash % 20;
  }

  private createCollaborativeFilteringModel(hyperparameters: Record<string, any>): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [3], // userId, eventId, interaction features
          units: hyperparameters.hiddenUnits || 64,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: hyperparameters.dropout || 0.2 }),
        tf.layers.dense({
          units: hyperparameters.hiddenUnits2 || 32,
          activation: 'relu',
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(hyperparameters.learningRate || 0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  private createContentBasedModel(hyperparameters: Record<string, any>): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [20], // Feature vector size
          units: hyperparameters.hiddenUnits || 128,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: hyperparameters.dropout || 0.3 }),
        tf.layers.dense({
          units: hyperparameters.hiddenUnits2 || 64,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: hyperparameters.dropout || 0.2 }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(hyperparameters.learningRate || 0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  private createHybridModel(hyperparameters: Record<string, any>): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [23], // Combined feature vector
          units: hyperparameters.hiddenUnits || 256,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: hyperparameters.dropout || 0.3 }),
        tf.layers.dense({
          units: hyperparameters.hiddenUnits2 || 128,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: hyperparameters.dropout || 0.2 }),
        tf.layers.dense({
          units: hyperparameters.hiddenUnits3 || 64,
          activation: 'relu',
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(hyperparameters.learningRate || 0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  private splitTrainingData(
    data: TrainingData[],
    config: ModelTrainingConfig,
  ): { trainX: tf.Tensor; trainY: tf.Tensor; testX: tf.Tensor; testY: tf.Tensor } {
    // Shuffle data
    const shuffled = data.sort(() => Math.random() - 0.5);
    
    const trainSize = Math.floor(data.length * config.trainingRatio);
    const trainData = shuffled.slice(0, trainSize);
    const testData = shuffled.slice(trainSize);

    // Convert to tensors
    const trainX = tf.tensor2d(trainData.map(d => d.features));
    const trainY = tf.tensor2d(trainData.map(d => [d.label]));
    const testX = tf.tensor2d(testData.map(d => d.features));
    const testY = tf.tensor2d(testData.map(d => [d.label]));

    return { trainX, trainY, testX, testY };
  }

  private async evaluateModel(
    model: tf.Sequential,
    testX: tf.Tensor,
    testY: tf.Tensor,
  ): Promise<{ accuracy: number; precision: number; recall: number; f1Score: number }> {
    const predictions = model.predict(testX) as tf.Tensor;
    const binaryPredictions = predictions.greater(0.5);
    
    // Calculate metrics
    const truePositives = tf.sum(tf.mul(testY, binaryPredictions));
    const falsePositives = tf.sum(tf.mul(tf.sub(1, testY), binaryPredictions));
    const falseNegatives = tf.sum(tf.mul(testY, tf.sub(1, binaryPredictions)));
    
    const precision = tf.div(truePositives, tf.add(truePositives, falsePositives));
    const recall = tf.div(truePositives, tf.add(truePositives, falseNegatives));
    const f1Score = tf.div(
      tf.mul(2, tf.mul(precision, recall)),
      tf.add(precision, recall),
    );

    const accuracy = tf.mean(tf.equal(binaryPredictions, testY));

    const results = {
      accuracy: await accuracy.data().then(d => d[0]),
      precision: await precision.data().then(d => d[0]),
      recall: await recall.data().then(d => d[0]),
      f1Score: await f1Score.data().then(d => d[0]),
    };

    // Cleanup tensors
    predictions.dispose();
    binaryPredictions.dispose();
    truePositives.dispose();
    falsePositives.dispose();
    falseNegatives.dispose();
    precision.dispose();
    recall.dispose();
    f1Score.dispose();
    accuracy.dispose();

    return results;
  }

  private async saveModel(model: tf.Sequential, modelId: string): Promise<string> {
    const modelPath = `./models/recommendation_${modelId}`;
    await model.save(`file://${modelPath}`);
    return modelPath;
  }

  private combineTrainingData(
    collaborativeData: TrainingData[],
    contentData: TrainingData[],
  ): TrainingData[] {
    const combined = new Map<string, TrainingData>();

    // Combine features for same user-event pairs
    for (const data of collaborativeData) {
      const key = `${data.userId}:${data.eventId}`;
      combined.set(key, data);
    }

    for (const data of contentData) {
      const key = `${data.userId}:${data.eventId}`;
      const existing = combined.get(key);
      
      if (existing) {
        existing.features = [...existing.features, ...data.features];
        existing.label = Math.max(existing.label, data.label);
      } else {
        combined.set(key, {
          ...data,
          features: [0, 0, 0, ...data.features], // Pad collaborative features
        });
      }
    }

    return Array.from(combined.values());
  }

  async getActiveModel(modelType?: ModelType): Promise<RecommendationModel | null> {
    const query = this.modelRepository
      .createQueryBuilder('model')
      .where('model.status = :status', { status: ModelStatus.READY })
      .andWhere('model.isActive = :active', { active: true });

    if (modelType) {
      query.andWhere('model.modelType = :type', { type: modelType });
    }

    return query
      .orderBy('model.accuracy', 'DESC')
      .addOrderBy('model.createdAt', 'DESC')
      .getOne();
  }

  async loadModel(modelPath: string): Promise<tf.LayersModel> {
    return tf.loadLayersModel(`file://${modelPath}`);
  }

  async scheduleModelRetraining(): Promise<void> {
    // This would be called periodically to retrain models with new data
    const config: ModelTrainingConfig = {
      modelType: ModelType.HYBRID,
      hyperparameters: {
        hiddenUnits: 256,
        hiddenUnits2: 128,
        hiddenUnits3: 64,
        dropout: 0.3,
        learningRate: 0.001,
      },
      trainingRatio: 0.8,
      validationRatio: 0.2,
      epochs: 50,
      batchSize: 32,
    };

    await this.trainHybridModel(config);
  }
}
