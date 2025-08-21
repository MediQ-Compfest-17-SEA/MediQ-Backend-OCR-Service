# MediQ Backend - OCR Service

## 📷 Deskripsi

Layanan **OCR Service** adalah komponen penting dalam sistem MediQ yang melakukan **pemrosesan KTP (e-KTP) otomatis** menggunakan teknologi Optical Character Recognition (OCR) dan Machine Learning. Service ini mengubah gambar KTP menjadi data terstruktur untuk pendaftaran pasien otomatis.

## ✨ Fitur Utama

### 🔍 Pemrosesan KTP Otomatis
- **Image Upload**: Upload gambar KTP dalam format JPG, PNG, WebP
- **OCR Processing**: Ekstraksi data menggunakan external OCR engine
- **Data Validation**: Validasi dan strukturisasi data KTP
- **Auto Registration**: Integrasi dengan User Service untuk pendaftaran otomatis

### 🤖 Machine Learning Integration
- **YOLO Detection**: Deteksi area teks pada KTP
- **Text Recognition**: Ekstraksi teks dengan akurasi tinggi
- **Data Parsing**: Parsing data sesuai format KTP Indonesia
- **Quality Assurance**: Validasi kualitas hasil OCR

### 🔄 Microservices Integration
- **RabbitMQ Communication**: Komunikasi dengan User Service dan Queue Service
- **Hybrid Architecture**: External access via API Gateway, internal direct communication
- **Real-time Processing**: Pemrosesan KTP real-time dengan response cepat

## 🚀 Quick Start

### Persyaratan
- **Node.js** 18+
- **External OCR Engine** (Python service pada port 8604)
- **RabbitMQ** 3.9+
- **File Storage** untuk temporary image processing

### Instalasi

```bash
# Clone repository
git clone https://github.com/MediQ-Compfest-17-SEA/MediQ-Backend-OCR-Service.git
cd MediQ-Backend-OCR-Service

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env sesuai konfigurasi environment Anda

# Start development server
npm run start:dev
```

### Environment Variables

```env
# Server Configuration
PORT=8603
NODE_ENV=development

# External OCR Engine
OCR_API_URL=http://localhost:8604/scan-ocr
OCR_API_KEY=your-ocr-api-key

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# File Upload
UPLOAD_LIMIT=10mb
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Logging
LOG_LEVEL=info
```

## 📋 API Endpoints

### Base URL
**Development**: `http://localhost:8603`  
**Production**: `https://api.mediq.com/ocr`

### Swagger Documentation
**Interactive API Docs**: `http://localhost:8603/api/docs`

### Core Endpoints

#### 📷 KTP Processing

**Upload dan Proses KTP**
```http
POST /ocr/upload
Content-Type: multipart/form-data

Form Data:
- file: [KTP image file - JPG/PNG/WebP, max 10MB]
```

**Response:**
```json
{
  "success": true,
  "message": "KTP scanned successfully. Please verify and edit the data.",
  "data": {
    "nik": "3171012345678901",
    "nama": "JOHN DOE SMITH",
    "tempat_lahir": "JAKARTA",
    "tgl_lahir": "01-01-1990",
    "jenis_kelamin": "LAKI-LAKI",
    "alamat": {
      "kel_desa": "MENTENG",
      "kecamatan": "MENTENG", 
      "name": "JL. SUDIRMAN NO. 123 RT 001 RW 002",
      "rt_rw": "001/002"
    },
    "agama": "ISLAM",
    "status_perkawinan": "BELUM KAWIN",
    "pekerjaan": "PELAJAR/MAHASISWA",
    "kewarganegaraan": "WNI",
    "berlaku_hingga": "SEUMUR HIDUP"
  }
}
```

**Konfirmasi Data dan Masuk Antrian**
```http
POST /ocr/confirm
Content-Type: application/json

{
  "nik": "3171012345678901",
  "nama": "John Doe Smith",
  "tempat_lahir": "Jakarta",
  "tgl_lahir": "1990-01-01",
  "jenis_kelamin": "Laki-laki",
  "alamat": "Jl. Sudirman No. 123 RT 001 RW 002, Menteng",
  "agama": "Islam",
  "status_perkawinan": "Belum Kawin",
  "pekerjaan": "Software Engineer",
  "kewarganegaraan": "WNI",
  "berlaku_hingga": "2025-01-01",
  "priority": "NORMAL"
}
```

#### 🔍 Health Check

**Service Health**
```http
GET /health
```

## 🧪 Testing

### Unit Testing
```bash
# Run all tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test ocr.service.spec.ts

# Test dengan file upload
npm run test:e2e
```

### Integration Testing
```bash
# Test RabbitMQ communication
npm run test:integration

# Test external OCR API integration
npm run test:ocr-integration
```

### Coverage Requirements
- **Statements**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%

### Testing dengan Sample Files
```bash
# Upload test KTP image
curl -X POST http://localhost:8603/ocr/upload \
  -F "file=@test/fixtures/sample-ktp.jpg" \
  -H "Content-Type: multipart/form-data"
```

## 🏗️ Arsitektur

### Service Flow
```
1. Client Upload KTP → OCR Service (Port 8603)
2. OCR Service → External OCR Engine (Port 8604)  
3. OCR Engine Response → Data Strukturisasi
4. User Verification → Data Confirmation
5. OCR Service → User Service (via RabbitMQ) → Create/Check User
6. OCR Service → Queue Service (via RabbitMQ) → Add to Queue
```

### Message Patterns (RabbitMQ)
```typescript
// Outgoing messages ke services lain
'user.check-nik-exists': { nik: string }
'user.create': CreateUserDto  
'user.get-by-nik': { nik: string }
'queue.add-to-queue': CreatePatientQueueDto

// Incoming messages (jika ada)
'ocr.process-image': { imageBuffer: Buffer, metadata: any }
'ocr.reprocess': { ocrId: string }
```

### File Processing Pipeline
```typescript
// 1. File Validation
- Format check (JPG, PNG, WebP)
- Size validation (max 10MB)
- Image dimension check

// 2. OCR Processing  
- Send to external OCR engine
- Parse OCR response
- Data cleaning dan normalization

// 3. User Management
- Check if NIK already exists
- Create new user jika belum ada
- Get existing user data

// 4. Queue Integration
- Add user to patient queue
- Set appropriate priority
- Return queue information
```

## 📦 Production Deployment

### Docker
```bash
# Build production image
docker build -t mediq/ocr-service:latest .

# Run container
docker run -p 8603:8603 \
  -e OCR_API_URL="http://ocr-engine:8604/scan-ocr" \
  -e RABBITMQ_URL="amqp://rabbitmq:5672" \
  -v /tmp/uploads:/app/uploads \
  mediq/ocr-service:latest
```

### Kubernetes
```bash
# Deploy to cluster
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=ocr-service

# View logs
kubectl logs -f deployment/ocr-service

# Scale replicas
kubectl scale deployment ocr-service --replicas=3
```

### External Dependencies
- **OCR Engine Service**: Python service untuk actual OCR processing
- **File Storage**: Temporary storage untuk image processing
- **RabbitMQ**: Message broker untuk service communication

## 🔧 Development

### Project Structure
```
src/
├── ocr/
│   ├── dto/                    # Data Transfer Objects
│   ├── domain/                 # Domain entities
│   ├── infrastructure/         # External service integration
│   ├── ocr.controller.ts       # HTTP endpoints
│   ├── ocr.service.ts         # Business logic
│   └── ocr.module.ts          # Module configuration
├── app.module.ts              # Main application module  
└── main.ts                    # Application bootstrap
```

### External OCR Engine Integration
```typescript
// OCR Engine API Call
async processImage(file: Express.Multer.File): Promise<OcrDataDto> {
  const formData = new FormData();
  formData.append('image', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  const response = await this.httpService.post(
    this.ocrApiUrl, 
    formData,
    { headers: formData.getHeaders() }
  );

  return this.parseOcrResponse(response.data);
}
```

### Error Handling
```typescript
// Comprehensive error handling
try {
  const result = await this.ocrService.processImage(file);
  return { success: true, data: result };
} catch (error) {
  if (error.code === 'INVALID_FILE_FORMAT') {
    throw new BadRequestException('Format file tidak didukung');
  } else if (error.code === 'OCR_ENGINE_UNAVAILABLE') {
    throw new ServiceUnavailableException('OCR engine sedang tidak tersedia');
  } else {
    throw new InternalServerErrorException('Gagal memproses KTP');
  }
}
```

## 🚨 Monitoring & Troubleshooting

### Health Checks
```bash
# Service health
curl http://localhost:8603/health

# OCR Engine connectivity
curl http://localhost:8604/health

# RabbitMQ connection
curl http://localhost:8603/ocr/status
```

### Common Issues

**File Upload Error**:
```bash
# Check file size limit
MAX_FILE_SIZE=10MB

# Supported formats
SUPPORTED_FORMATS="image/jpeg,image/png,image/webp"

# Check disk space
df -h /tmp
```

**OCR Engine Connection Error**:
```bash
# Test OCR engine
curl -X POST http://localhost:8604/scan-ocr \
  -F "image=@sample-ktp.jpg"

# Check OCR engine logs
docker logs ocr-engine-container

# Verify OCR_API_URL configuration
echo $OCR_API_URL
```

**RabbitMQ Communication Error**:
```bash
# Check RabbitMQ queues
rabbitmqctl list_queues

# Test User Service connectivity
curl http://localhost:8602/health

# Check queue messages
rabbitmqctl list_queues name messages
```

### Performance Monitoring
```typescript
// OCR processing time tracking
const startTime = Date.now();
const result = await this.processImage(file);
const processingTime = Date.now() - startTime;

logger.info('OCR processing completed', {
  fileName: file.originalname,
  fileSize: file.size,
  processingTime: `${processingTime}ms`,
  success: true
});
```

### Logging Strategy
```typescript
// Structured logging dengan correlation IDs
logger.info('KTP processing started', {
  correlationId: req.headers['x-correlation-id'],
  fileName: file.originalname,
  fileSize: file.size,
  clientIP: req.ip
});
```

## 🔒 Security Considerations

### File Upload Security
- **File Type Validation**: Hanya image files yang diizinkan
- **File Size Limits**: Maximum 10MB per upload
- **Virus Scanning**: Integration dengan antivirus scanner (production)
- **Temporary Storage**: Auto-cleanup uploaded files setelah processing

### Data Privacy
- **KTP Data**: Sensitive personal information handling
- **Data Retention**: Automatic deletion setelah processing
- **Audit Trail**: Log semua OCR operations untuk compliance
- **GDPR Compliance**: Data protection dan user consent

### API Security
- **Rate Limiting**: Prevent abuse dengan rate limiting
- **Input Validation**: Comprehensive validation untuk semua inputs  
- **Error Information**: Tidak expose sensitive system information
- **Authentication**: Integration dengan API Gateway untuk auth

## 🎭 Use Cases

### Scenario 1: Pendaftaran Pasien Baru
1. **Pasien scan KTP** di kiosk atau mobile app
2. **OCR Service** process gambar KTP
3. **Data verification** oleh pasien atau operator
4. **Konfirmasi data** → create user + add to queue
5. **Nomor antrian** ditampilkan ke pasien

### Scenario 2: Pasien Existing  
1. **Pasien scan KTP** yang sudah terdaftar
2. **OCR Service** detect existing NIK
3. **Auto-login** atau **queue addition** langsung
4. **Update antrian** dengan data terbaru

### Scenario 3: Batch Processing
1. **Multiple KTP upload** untuk pendaftaran massal
2. **Parallel OCR processing** untuk efficiency
3. **Batch user creation** dan queue management
4. **Report generation** untuk administration

## 🤝 Contributing

1. **Fork** repository
2. **Create branch** (`git checkout -b feature/ocr-enhancement`)
3. **Add tests** dengan 100% coverage
4. **Update documentation** jika diperlukan
5. **Commit changes** (`git commit -m 'Enhance OCR accuracy'`)
6. **Push branch** (`git push origin feature/ocr-enhancement`)
7. **Create Pull Request**

### Development Guidelines
- **TDD Approach**: Write tests first, then implementation
- **Error Handling**: Comprehensive error scenarios
- **Performance**: Monitor OCR processing time
- **Security**: Handle sensitive KTP data properly
- **Documentation**: Update API docs untuk new features

## 📄 License

Copyright (c) 2024 MediQ Team. All rights reserved.

---

**💡 Tips Pengembangan**:
- Test dengan berbagai kualitas gambar KTP untuk improve accuracy
- Monitor external OCR engine performance dan implement fallback
- Gunakan correlation IDs untuk debugging cross-service communication
- Implement caching untuk frequently processed KTP images
- Consider batch processing untuk high-volume scenarios

**🔗 Related Services**:
- **User Service**: Target untuk user creation/lookup
- **Patient Queue Service**: Target untuk queue management  
- **OCR Engine Service**: External engine untuk actual OCR processing
- **API Gateway**: Entry point untuk external client access
