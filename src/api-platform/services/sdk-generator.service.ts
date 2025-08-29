import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiDocumentation, DocumentationType } from '../entities/api-documentation.entity';

export interface SdkConfig {
  language: 'javascript' | 'python' | 'php' | 'ruby' | 'go' | 'java' | 'csharp';
  packageName: string;
  version: string;
  baseUrl: string;
  includeExamples?: boolean;
  includeTests?: boolean;
}

@Injectable()
export class SdkGeneratorService {
  constructor(
    @InjectRepository(ApiDocumentation)
    private documentationRepository: Repository<ApiDocumentation>,
  ) {}

  async generateSdk(config: SdkConfig): Promise<{ files: Record<string, string>; metadata: any }> {
    const endpoints = await this.documentationRepository.find({
      where: { 
        type: DocumentationType.ENDPOINT,
        status: 'published' as any
      },
      order: { category: 'ASC', sortOrder: 'ASC' },
    });

    switch (config.language) {
      case 'javascript':
        return this.generateJavaScriptSdk(endpoints, config);
      case 'python':
        return this.generatePythonSdk(endpoints, config);
      case 'php':
        return this.generatePhpSdk(endpoints, config);
      case 'ruby':
        return this.generateRubySdk(endpoints, config);
      case 'go':
        return this.generateGoSdk(endpoints, config);
      case 'java':
        return this.generateJavaSdk(endpoints, config);
      case 'csharp':
        return this.generateCSharpSdk(endpoints, config);
      default:
        throw new Error(`Unsupported language: ${config.language}`);
    }
  }

  private async generateJavaScriptSdk(endpoints: ApiDocumentation[], config: SdkConfig) {
    const files: Record<string, string> = {};

    // Package.json
    files['package.json'] = JSON.stringify({
      name: config.packageName,
      version: config.version,
      description: 'Veritix API SDK for JavaScript/Node.js',
      main: 'index.js',
      types: 'index.d.ts',
      scripts: {
        test: 'jest',
        build: 'tsc',
      },
      dependencies: {
        axios: '^1.0.0',
      },
      devDependencies: {
        '@types/node': '^18.0.0',
        typescript: '^4.9.0',
        jest: '^29.0.0',
      },
    }, null, 2);

    // Main SDK class
    files['index.js'] = this.generateJavaScriptClient(endpoints, config);
    files['index.d.ts'] = this.generateJavaScriptTypes(endpoints, config);

    // Individual endpoint modules
    const categories = [...new Set(endpoints.map(e => e.category || 'general'))];
    for (const category of categories) {
      const categoryEndpoints = endpoints.filter(e => (e.category || 'general') === category);
      files[`${category}.js`] = this.generateJavaScriptModule(categoryEndpoints, category, config);
    }

    // README
    files['README.md'] = this.generateReadme(config);

    if (config.includeExamples) {
      files['examples/basic-usage.js'] = this.generateJavaScriptExamples(endpoints, config);
    }

    if (config.includeTests) {
      files['__tests__/client.test.js'] = this.generateJavaScriptTests(endpoints, config);
    }

    return {
      files,
      metadata: {
        language: 'javascript',
        packageName: config.packageName,
        version: config.version,
        endpointCount: endpoints.length,
        categories: categories.length,
      },
    };
  }

  private generateJavaScriptClient(endpoints: ApiDocumentation[], config: SdkConfig): string {
    const categories = [...new Set(endpoints.map(e => e.category || 'general'))];
    
    return `const axios = require('axios');
${categories.map(cat => `const ${this.toCamelCase(cat)} = require('./${cat}');`).join('\n')}

class VeritixClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || '${config.baseUrl}';
    this.timeout = options.timeout || 30000;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        'User-Agent': '${config.packageName}/${config.version}',
      },
    });

    // Initialize endpoint categories
${categories.map(cat => `    this.${this.toCamelCase(cat)} = new ${this.toPascalCase(cat)}(this.client);`).join('\n')}
  }

  async request(method, endpoint, data = null, options = {}) {
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
        ...options,
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(\`API Error (\${error.response.status}): \${error.response.data.message || error.message}\`);
      }
      throw error;
    }
  }
}

module.exports = VeritixClient;`;
  }

  private generateJavaScriptTypes(endpoints: ApiDocumentation[], config: SdkConfig): string {
    return `export interface VeritixClientOptions {
  baseURL?: string;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export declare class VeritixClient {
  constructor(apiKey: string, options?: VeritixClientOptions);
  request<T = any>(method: string, endpoint: string, data?: any, options?: any): Promise<T>;
}

export default VeritixClient;`;
  }

  private generateJavaScriptModule(endpoints: ApiDocumentation[], category: string, config: SdkConfig): string {
    const methods = endpoints.map(endpoint => {
      const methodName = this.generateMethodName(endpoint.endpoint, endpoint.method);
      const params = this.extractParameters(endpoint.parameters);
      
      return `  async ${methodName}(${params.join(', ')}) {
    return this.client.request({
      method: '${endpoint.method?.toUpperCase()}',
      url: '${endpoint.endpoint}',
      ${endpoint.method?.toLowerCase() === 'get' ? 'params: data' : 'data'}
    });
  }`;
    }).join('\n\n');

    return `class ${this.toPascalCase(category)} {
  constructor(client) {
    this.client = client;
  }

${methods}
}

module.exports = ${this.toPascalCase(category)};`;
  }

  private async generatePythonSdk(endpoints: ApiDocumentation[], config: SdkConfig) {
    const files: Record<string, string> = {};

    // Setup.py
    files['setup.py'] = `from setuptools import setup, find_packages

setup(
    name="${config.packageName}",
    version="${config.version}",
    description="Veritix API SDK for Python",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    python_requires=">=3.7",
)`;

    // Main client
    files['veritix/__init__.py'] = this.generatePythonClient(endpoints, config);

    // Individual modules
    const categories = [...new Set(endpoints.map(e => e.category || 'general'))];
    for (const category of categories) {
      const categoryEndpoints = endpoints.filter(e => (e.category || 'general') === category);
      files[`veritix/${category}.py`] = this.generatePythonModule(categoryEndpoints, category, config);
    }

    files['README.md'] = this.generateReadme(config);

    return { files, metadata: { language: 'python' } };
  }

  private generatePythonClient(endpoints: ApiDocumentation[], config: SdkConfig): string {
    const categories = [...new Set(endpoints.map(e => e.category || 'general'))];
    
    return `import requests
from typing import Dict, Any, Optional
${categories.map(cat => `from .${cat} import ${this.toPascalCase(cat)}`).join('\n')}

class VeritixClient:
    def __init__(self, api_key: str, base_url: str = "${config.baseUrl}", timeout: int = 30):
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': '${config.packageName}/${config.version}',
        })

        # Initialize endpoint categories
${categories.map(cat => `        self.${this.toSnakeCase(cat)} = ${this.toPascalCase(cat)}(self)`).join('\n')}

    def request(self, method: str, endpoint: str, data: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data if method.upper() != 'GET' else None,
                params=data if method.upper() == 'GET' else None,
                timeout=self.timeout,
                **kwargs
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {e}")`;
  }

  private generatePythonModule(endpoints: ApiDocumentation[], category: string, config: SdkConfig): string {
    const methods = endpoints.map(endpoint => {
      const methodName = this.toSnakeCase(this.generateMethodName(endpoint.endpoint, endpoint.method));
      
      return `    def ${methodName}(self, **kwargs):
        """${endpoint.description || `${endpoint.method?.toUpperCase()} ${endpoint.endpoint}`}"""
        return self.client.request('${endpoint.method?.toUpperCase()}', '${endpoint.endpoint}', kwargs)`;
    }).join('\n\n');

    return `class ${this.toPascalCase(category)}:
    def __init__(self, client):
        self.client = client

${methods}`;
  }

  private async generatePhpSdk(endpoints: ApiDocumentation[], config: SdkConfig) {
    const files: Record<string, string> = {};

    files['composer.json'] = JSON.stringify({
      name: config.packageName,
      version: config.version,
      description: 'Veritix API SDK for PHP',
      require: {
        'php': '>=7.4',
        'guzzlehttp/guzzle': '^7.0',
      },
      autoload: {
        'psr-4': {
          'Veritix\\': 'src/',
        },
      },
    }, null, 2);

    files['src/Client.php'] = this.generatePhpClient(endpoints, config);
    files['README.md'] = this.generateReadme(config);

    return { files, metadata: { language: 'php' } };
  }

  private generatePhpClient(endpoints: ApiDocumentation[], config: SdkConfig): string {
    return `<?php

namespace Veritix;

use GuzzleHttp\\Client as HttpClient;
use GuzzleHttp\\Exception\\RequestException;

class Client
{
    private $apiKey;
    private $baseUrl;
    private $httpClient;

    public function __construct(string $apiKey, string $baseUrl = '${config.baseUrl}')
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
        
        $this->httpClient = new HttpClient([
            'base_uri' => $this->baseUrl,
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
                'User-Agent' => '${config.packageName}/${config.version}',
            ],
        ]);
    }

    public function request(string $method, string $endpoint, array $data = []): array
    {
        try {
            $options = [];
            if (strtoupper($method) === 'GET') {
                $options['query'] = $data;
            } else {
                $options['json'] = $data;
            }

            $response = $this->httpClient->request($method, $endpoint, $options);
            return json_decode($response->getBody()->getContents(), true);
        } catch (RequestException $e) {
            throw new \\Exception('API request failed: ' . $e->getMessage());
        }
    }
}`;
  }

  private generateReadme(config: SdkConfig): string {
    return `# ${config.packageName}

Official ${config.language.toUpperCase()} SDK for the Veritix API.

## Installation

\`\`\`bash
${config.language === 'javascript' ? 'npm install ' + config.packageName : 
  config.language === 'python' ? 'pip install ' + config.packageName :
  config.language === 'php' ? 'composer require ' + config.packageName :
  'See documentation for installation instructions'}
\`\`\`

## Usage

\`\`\`${config.language}
${config.language === 'javascript' ? `const VeritixClient = require('${config.packageName}');

const client = new VeritixClient('your-api-key');
const users = await client.users.list();` :
  config.language === 'python' ? `from veritix import VeritixClient

client = VeritixClient('your-api-key')
users = client.users.list()` :
  config.language === 'php' ? `<?php
use Veritix\\Client;

$client = new Client('your-api-key');
$users = $client->request('GET', '/users');` :
  'See documentation for usage examples'}
\`\`\`

## Documentation

For full API documentation, visit: https://docs.veritix.com

## Support

- GitHub Issues: https://github.com/veritix/sdk-${config.language}
- Email: api-support@veritix.com
`;
  }

  private generateJavaScriptExamples(endpoints: ApiDocumentation[], config: SdkConfig): string {
    return `const VeritixClient = require('${config.packageName}');

// Initialize client
const client = new VeritixClient('your-api-key-here');

async function examples() {
  try {
    // Example API calls
    const users = await client.users.list();
    console.log('Users:', users);

    const newUser = await client.users.create({
      name: 'John Doe',
      email: 'john@example.com'
    });
    console.log('Created user:', newUser);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

examples();`;
  }

  private generateJavaScriptTests(endpoints: ApiDocumentation[], config: SdkConfig): string {
    return `const VeritixClient = require('../index');

describe('VeritixClient', () => {
  let client;

  beforeEach(() => {
    client = new VeritixClient('test-api-key');
  });

  test('should initialize with API key', () => {
    expect(client.apiKey).toBe('test-api-key');
  });

  test('should make API requests', async () => {
    // Mock API response
    const mockResponse = { data: { id: 1, name: 'Test' } };
    client.client.request = jest.fn().mockResolvedValue({ data: mockResponse });

    const result = await client.request('GET', '/test');
    expect(result).toEqual(mockResponse);
  });
});`;
  }

  // Utility methods
  private toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/^[A-Z]/, (g) => g.toLowerCase());
  }

  private toPascalCase(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/^[a-z]/, (g) => g.toUpperCase());
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  private generateMethodName(endpoint: string, method: string): string {
    const parts = endpoint.split('/').filter(part => part && !part.startsWith(':'));
    const action = method?.toLowerCase() === 'get' ? 'get' : 
                   method?.toLowerCase() === 'post' ? 'create' :
                   method?.toLowerCase() === 'put' ? 'update' :
                   method?.toLowerCase() === 'delete' ? 'delete' : 'request';
    
    return action + parts.map(part => this.toPascalCase(part)).join('');
  }

  private extractParameters(parameters: any): string[] {
    if (!parameters || typeof parameters !== 'object') return ['data = {}'];
    
    const required = [];
    const optional = [];
    
    for (const [key, param] of Object.entries(parameters)) {
      if (typeof param === 'object' && param !== null) {
        const paramObj = param as any;
        if (paramObj.required) {
          required.push(key);
        } else {
          optional.push(`${key} = null`);
        }
      }
    }
    
    return [...required, ...optional, 'options = {}'];
  }
}
