import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import {
  RevenueForecastQueryDto,
  RevenueForecastResponseDto,
  HistoricalDataPoint,
  PredictionDataPoint,
  ModelMetrics,
} from "./revenue-forecast.dto";

interface TicketSale {
  id: string;
  eventId: string;
  saleDate: Date;
  price: number;
  priceTier: string;
  quantity: number;
}

@Injectable()
export class RevenueForecastService {
  private readonly logger = new Logger(RevenueForecastService.name);

  async generateForecast(
    query: RevenueForecastQueryDto
  ): Promise<RevenueForecastResponseDto> {
    try {
      // Fetch historical data based on filters
      const historicalData = await this.getHistoricalData(query);

      if (historicalData.length < 3) {
        throw new BadRequestException(
          "Insufficient historical data for accurate prediction"
        );
      }

      // Prepare data for linear regression
      const { x, y } = this.prepareRegressionData(historicalData);

      // Perform linear regression
      const { slope, intercept, rSquared } = this.performLinearRegression(x, y);

      // Generate predictions
      const predictions = this.generatePredictions(
        slope,
        intercept,
        historicalData.length,
        query.forecastPeriods,
        query.timeframe
      );

      // Calculate model metrics
      const modelMetrics = this.calculateModelMetrics(x, y, slope, intercept);

      // Calculate confidence intervals
      const confidenceInterval = this.calculateConfidenceInterval(
        predictions,
        modelMetrics.rootMeanSquareError
      );

      // Calculate total predicted revenue
      const totalPredictedRevenue = predictions.reduce(
        (sum, pred) => sum + pred.predictedRevenue,
        0
      );

      return {
        historicalData,
        predictions,
        modelMetrics,
        filters: query,
        totalPredictedRevenue,
        confidenceInterval,
      };
    } catch (error) {
      this.logger.error(
        `Error generating forecast: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async getHistoricalData(
    query: RevenueForecastQueryDto
  ): Promise<HistoricalDataPoint[]> {
    // In a real application, this would query your database
    // For demo purposes, generating mock data
    const mockSales = this.generateMockSalesData(query);

    return this.aggregateDataByTimeframe(mockSales, query.timeframe);
  }

  private generateMockSalesData(query: RevenueForecastQueryDto): TicketSale[] {
    const sales: TicketSale[] = [];
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const priceTiers = {
      basic: 50,
      premium: 100,
      vip: 200,
    };

    // Generate mock sales data with trends
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      if (query.eventId && Math.random() > 0.7) continue; // Simulate event-specific filtering

      const salesCount = Math.floor(Math.random() * 20) + 5;

      for (let i = 0; i < salesCount; i++) {
        const tiers = Object.keys(priceTiers);
        const selectedTier = tiers[Math.floor(Math.random() * tiers.length)];

        if (query.priceTier !== "all" && query.priceTier !== selectedTier)
          continue;

        sales.push({
          id: `${date.getTime()}_${i}`,
          eventId:
            query.eventId || `event_${Math.floor(Math.random() * 5) + 1}`,
          saleDate: new Date(date),
          price: priceTiers[selectedTier] + (Math.random() * 20 - 10), // Add some variance
          priceTier: selectedTier,
          quantity: 1,
        });
      }
    }

    return sales;
  }

  private aggregateDataByTimeframe(
    sales: TicketSale[],
    timeframe: string
  ): HistoricalDataPoint[] {
    const grouped = new Map<string, TicketSale[]>();

    sales.forEach((sale) => {
      const key = this.getTimeframeKey(sale.saleDate, timeframe);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(sale);
    });

    return Array.from(grouped.entries())
      .map(([date, salesGroup]) => ({
        date,
        revenue: salesGroup.reduce(
          (sum, sale) => sum + sale.price * sale.quantity,
          0
        ),
        ticketsSold: salesGroup.length,
        averagePrice:
          salesGroup.reduce((sum, sale) => sum + sale.price, 0) /
          salesGroup.length,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private getTimeframeKey(date: Date, timeframe: string): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    switch (timeframe) {
      case "daily":
        return `${year}-${month.toString().padStart(2, "0")}-${day
          .toString()
          .padStart(2, "0")}`;
      case "weekly":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil(
          weekStart.getDate() / 7
        )}`;
      case "monthly":
        return `${year}-${month.toString().padStart(2, "0")}`;
      case "quarterly":
        const quarter = Math.ceil(month / 3);
        return `${year}-Q${quarter}`;
      default:
        return `${year}-${month.toString().padStart(2, "0")}`;
    }
  }

  private prepareRegressionData(data: HistoricalDataPoint[]): {
    x: number[];
    y: number[];
  } {
    const x = data.map((_, index) => index);
    const y = data.map((point) => point.revenue);
    return { x, y };
  }

  private performLinearRegression(
    x: number[],
    y: number[]
  ): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const totalSumSquares = y.reduce(
      (sum, yi) => sum + Math.pow(yi - yMean, 2),
      0
    );
    const residualSumSquares = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);

    const rSquared = 1 - residualSumSquares / totalSumSquares;

    return { slope, intercept, rSquared };
  }

  private generatePredictions(
    slope: number,
    intercept: number,
    startIndex: number,
    periods: number,
    timeframe: string
  ): PredictionDataPoint[] {
    const predictions: PredictionDataPoint[] = [];

    for (let i = 0; i < periods; i++) {
      const x = startIndex + i;
      const predictedRevenue = slope * x + intercept;
      const confidence = Math.max(0.6, 1 - i * 0.05); // Confidence decreases over time

      const trend =
        slope > 5 ? "increasing" : slope < -5 ? "decreasing" : "stable";

      predictions.push({
        date: this.getFutureDate(i, timeframe),
        predictedRevenue: Math.max(0, predictedRevenue), // Ensure non-negative
        confidence,
        trend,
      });
    }

    return predictions;
  }

  private getFutureDate(periodsFromNow: number, timeframe: string): string {
    const now = new Date();
    const futureDate = new Date(now);

    switch (timeframe) {
      case "daily":
        futureDate.setDate(now.getDate() + periodsFromNow);
        break;
      case "weekly":
        futureDate.setDate(now.getDate() + periodsFromNow * 7);
        break;
      case "monthly":
        futureDate.setMonth(now.getMonth() + periodsFromNow);
        break;
      case "quarterly":
        futureDate.setMonth(now.getMonth() + periodsFromNow * 3);
        break;
    }

    return futureDate.toISOString().split("T")[0];
  }

  private calculateModelMetrics(
    x: number[],
    y: number[],
    slope: number,
    intercept: number
  ): ModelMetrics {
    const predictions = x.map((xi) => slope * xi + intercept);
    const errors = y.map((yi, i) => Math.abs(yi - predictions[i]));
    const squaredErrors = y.map((yi, i) => Math.pow(yi - predictions[i], 2));

    const meanAbsoluteError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const rootMeanSquareError = Math.sqrt(
      squaredErrors.reduce((a, b) => a + b, 0) / squaredErrors.length
    );

    // R-squared calculation
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    const totalSumSquares = y.reduce(
      (sum, yi) => sum + Math.pow(yi - yMean, 2),
      0
    );
    const residualSumSquares = squaredErrors.reduce((a, b) => a + b, 0);
    const rSquared = 1 - residualSumSquares / totalSumSquares;

    return {
      rSquared,
      meanAbsoluteError,
      rootMeanSquareError,
      modelType: "Linear Regression",
    };
  }

  private calculateConfidenceInterval(
    predictions: PredictionDataPoint[],
    rmse: number
  ): { lower: number[]; upper: number[] } {
    const confidenceLevel = 1.96; // 95% confidence interval

    return {
      lower: predictions.map((pred) =>
        Math.max(0, pred.predictedRevenue - confidenceLevel * rmse)
      ),
      upper: predictions.map(
        (pred) => pred.predictedRevenue + confidenceLevel * rmse
      ),
    };
  }
}
