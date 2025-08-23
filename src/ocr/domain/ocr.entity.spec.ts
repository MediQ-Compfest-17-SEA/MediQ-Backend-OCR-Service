import { Alamat, OcrEntity } from './ocr.entity';

describe('Ocr domain entities', () => {
  it('Alamat should assign all fields', () => {
    const a = new Alamat('Kel A', 'Kec B', 'Jl. C No. 1', '001/002');
    expect(a.kel_desa).toBe('Kel A');
    expect(a.kecamatan).toBe('Kec B');
    expect(a.name).toBe('Jl. C No. 1');
    expect(a.rt_rw).toBe('001/002');
  });

  it('OcrEntity should assign full KTP payload', () => {
    const alamat = new Alamat('Kel X', 'Kec Y', 'Jl. Z', '003/004');
    const e = new OcrEntity(
      '1234567890123456',
      'Nama Lengkap',
      'Jakarta',
      '1990-01-01',
      'LAKI-LAKI',
      alamat,
      'ISLAM',
      'KAWIN',
      'PEGAWAI',
      'WNI',
      'SEUMUR HIDUP',
    );

    expect(e.nik).toBe('1234567890123456');
    expect(e.nama).toBe('Nama Lengkap');
    expect(e.tempat_lahir).toBe('Jakarta');
    expect(e.tgl_lahir).toBe('1990-01-01');
    expect(e.jenis_kelamin).toBe('LAKI-LAKI');
    expect(e.alamat).toBe(alamat);
    expect(e.agama).toBe('ISLAM');
    expect(e.status_perkawinan).toBe('KAWIN');
    expect(e.pekerjaan).toBe('PEGAWAI');
    expect(e.kewarganegaraan).toBe('WNI');
    expect(e.berlaku_hingga).toBe('SEUMUR HIDUP');
  });
});