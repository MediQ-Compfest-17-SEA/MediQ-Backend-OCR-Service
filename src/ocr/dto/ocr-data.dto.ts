export class AlamatDto {
    kel_desa: string;
    kecamatan: string;
    name: string;
    rt_rw: string;
}

export class OcrDataDto {
    nik: string;
    nama: string;
    tempat_lahir: string;
    tgl_lahir: string;
    jenis_kelamin: string;
    alamat: AlamatDto;
    agama: string;
    status_perkawinan: string;
    pekerjaan: string;
    kewarganegaraan: string;
    berlaku_hingga: string;
}