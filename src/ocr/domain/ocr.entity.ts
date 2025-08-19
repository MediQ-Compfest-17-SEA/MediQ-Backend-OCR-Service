export class Alamat {
    constructor(
        public kel_desa: string,
        public name: string,
        public rt_rw: string,
    ) { }
}

export class OcrEntity {
    constructor(
        public nik: string,
        public nama: string,
        public tempat_lahir: string,
        public tgl_lahir: string,
        public jenis_kelamin: string,
        public alamat: Alamat,
        public agama: string,
        public status_perkawinan: string,
        public pekerjaan: string,
        public kewarganegaraan: string,
        public berlaku_hingga: string,
    ) { }
}