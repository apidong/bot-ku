const fs = require("fs");
const path = require("path");
const snippetFile = path.join(__dirname, "snippets.json");
const snippets = JSON.parse(fs.readFileSync(snippetFile, "utf8"));
const inquirer = require('inquirer');


async function cekLog(sourceCodePath, connection, version = 2212) {
    let logpath
    if (version < 2212) {
        logpath = path.join(sourceCodePath, "logs");
    } else {
        logpath = path.join(sourceCodePath, "storage", "logs");
    }
    console.log('cek log di path :', logpath);

    return new Promise((resolve, reject) => {
        if (fs.existsSync(logpath)) {
            fs.readdir(logpath, async (err, files) => {
                if (err) {
                    console.error("Gagal membaca direktori:", err);
                    return reject(err);
                }

                let hasil = [];

                files.forEach(file => {
                    const filePath = path.join(logpath, file);
                    if (fs.lstatSync(filePath).isFile()) {
                        const content = fs.readFileSync(filePath, "utf8");

                        let found = false;
                        snippets.forEach(async snippet => {
                            if (content.includes(snippet)) {
                                if (!found) {
                                    console.log(`\nDitemukan di file: ${file}`);
                                    found = true;

                                    const firstLine = snippet.split('\n')[0];
                                    console.log(` - Mengandung: ${firstLine}...`);

                                    hasil.push({ file, match: firstLine });

                                    if (firstLine.includes('CONSTRAINT `fk_id_modul`')) {
                                        await perbaikiSettingModul(connection); // fungsi eksternal
                                    }

                                    if (firstLine.includes("log_bulanan' doesn't exist")) {
                                        await perbaikiLogBulanan(connection); // fungsi eksternal
                                    }

                                    if (firstLine.includes("Invalid query: ALTER TABLE user ADD UNIQUE email (`email`)")) {
                                        await perbaikiuseremail(connection); // fungsi eksternal
                                    }
                                }
                            }
                        });
                    }
                });


                await clearLogFiles(logpath)
                resolve(hasil); // ← hasil return
            });
        }
        resolve(true); // ← hasil return
    });
};

async function perbaikiSettingModul(connection) {
    const [rows] = await connection.execute(`
		SELECT id
		FROM (
			SELECT 1 AS id UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
			SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL
			SELECT 11 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 17 UNION ALL
			SELECT 18 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL
			SELECT 24 UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL
			SELECT 29 UNION ALL SELECT 30 UNION ALL SELECT 31 UNION ALL SELECT 32 UNION ALL SELECT 39 UNION ALL
			SELECT 40 UNION ALL SELECT 42 UNION ALL SELECT 47 UNION ALL SELECT 48 UNION ALL SELECT 49 UNION ALL
			SELECT 50 UNION ALL SELECT 51 UNION ALL SELECT 52 UNION ALL SELECT 53 UNION ALL SELECT 54 UNION ALL
			SELECT 55 UNION ALL SELECT 56 UNION ALL SELECT 57 UNION ALL SELECT 58 UNION ALL SELECT 61 UNION ALL
			SELECT 62 UNION ALL SELECT 63 UNION ALL SELECT 64 UNION ALL SELECT 65 UNION ALL SELECT 66 UNION ALL
			SELECT 67 UNION ALL SELECT 68 UNION ALL SELECT 69 UNION ALL SELECT 70 UNION ALL SELECT 71 UNION ALL
			SELECT 72 UNION ALL SELECT 73 UNION ALL SELECT 75 UNION ALL SELECT 76 UNION ALL SELECT 77 UNION ALL
			SELECT 78 UNION ALL SELECT 79 UNION ALL SELECT 80 UNION ALL SELECT 81 UNION ALL SELECT 82 UNION ALL
			SELECT 83 UNION ALL SELECT 84 UNION ALL SELECT 85 UNION ALL SELECT 86 UNION ALL SELECT 87 UNION ALL
			SELECT 88 UNION ALL SELECT 89 UNION ALL SELECT 90 UNION ALL SELECT 91 UNION ALL SELECT 92 UNION ALL
			SELECT 93 UNION ALL SELECT 94 UNION ALL SELECT 95 UNION ALL SELECT 96 UNION ALL SELECT 97 UNION ALL
			SELECT 98 UNION ALL SELECT 101 UNION ALL SELECT 200 UNION ALL SELECT 201 UNION ALL SELECT 202 UNION ALL
			SELECT 203 UNION ALL SELECT 205 UNION ALL SELECT 206 UNION ALL SELECT 207 UNION ALL SELECT 208 UNION ALL
			SELECT 209 UNION ALL SELECT 210 UNION ALL SELECT 211 UNION ALL SELECT 212 UNION ALL SELECT 213 UNION ALL
			SELECT 220 UNION ALL SELECT 221 UNION ALL SELECT 301 UNION ALL SELECT 302 UNION ALL SELECT 303 UNION ALL
			SELECT 304 UNION ALL SELECT 305 UNION ALL SELECT 310 UNION ALL SELECT 311 UNION ALL SELECT 312 UNION ALL
			SELECT 314 UNION ALL SELECT 315 UNION ALL SELECT 316 UNION ALL SELECT 317 UNION ALL SELECT 318
		) AS data
		WHERE id NOT IN (SELECT id FROM setting_modul)
	`);

    // Ambil ID yang perlu dijalankan (misalnya dari tabel lain atau hasil query)
    const targetIds = [];
    rows.forEach(row => {
        console.log(`ID belum ada di setting_modul: ${row.id}`);
        targetIds.push(row.id); // Menyimpan ID yang akan dijalankan
    });
    fs.readFile('setting_modul.sql', 'utf8', (err, data) => {
        if (err) {
            console.error('Gagal membaca file:', err);
            return;
        }
        // Memecah file menjadi query berdasarkan tanda semicolon
        const queries = data.split(';\r\n');

        queries.forEach(query => {
            // Mengecek apakah query adalah INSERT dan mengandung ID yang sesuai
            const match = query.match(/INSERT INTO `setting_modul` VALUES \((\d+),/);

            if (match) {
                const id = parseInt(match[1], 10);

                if (targetIds.includes(id)) {
                    // Menjalankan query untuk ID yang cocok
                    connection.query(query);
                    console.log(`Berhasil menjalankan query :  ${query}`);
                }
            }
        });

    });


};
async function perbaikiLogBulanan(connection) {
    console.log('perbaiki table log_bulanan...');
    const tableName = 'log_bulanan';

    const query = `
    SELECT COUNT(*) AS table_exists
    FROM information_schema.tables
    WHERE table_name = ? AND table_schema = DATABASE();
    `;
    console.log('QUERY:', query);
    console.log('PARAMS:', [tableName]);

    const [rows] = await connection.execute(query, [tableName]);

    console.log(rows);
    console.log('cek tabel bulanan : ', rows);
    if (rows[0].table_exists > 0) {
        console.log('Tabel log_bulanan ADA');
    } else {
        console.log('Tabel log_bulanan TIDAK ADA');
        console.log('Buat Tabel log_bulanan...');
        await connection.execute(`
        CREATE TABLE \`log_bulanan\` (
            \`id\` INT(11) NOT NULL AUTO_INCREMENT,
            \`pend\` INT(11) NOT NULL,
            \`wni_lk\` INT(11) DEFAULT NULL,
            \`wni_pr\` INT(11) DEFAULT NULL,
            \`kk\` INT(11) NOT NULL,
            \`tgl\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            \`kk_lk\` INT(11) DEFAULT NULL,
            \`kk_pr\` INT(11) DEFAULT NULL,
            \`wna_lk\` INT(11) DEFAULT NULL,
            \`wna_pr\` INT(11) DEFAULT NULL,
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB;
        `);
        console.log('tabel log_bulanan berhasil dibuat');
    }
};

async function clearLogFiles(directoryPath) {
    console.log('bersihkan log di :' + directoryPath);
    if (fs.existsSync(directoryPath)) {
        try {
            const files = fs.readdirSync(directoryPath);

            files.forEach(file => {
                const filePath = path.join(directoryPath, file);

                if (fs.statSync(filePath).isFile() && (file.endsWith('.log') || file.endsWith('.php'))) {
                    fs.unlinkSync(filePath);
                    console.log(`File '${filePath}' telah berhasil dihapus.`);
                }
            });

            console.log("Pembersihan file .log selesai.");
        } catch (err) {
            console.error("Terjadi kesalahan saat menghapus file .log:", err.message);
        }
    } else {
        console.log(`Folder '${directoryPath}' tidak ditemukan.`);
    }
}

async function perbaikiuseremail(connection) {
    const query = `SELECT * FROM user`;
    const [rows] = await connection.execute(query);
    rows.forEach(async row => {
        const email = row.nama + row.id + '@gmail.com';
        const id = row.id;
        const query2 = `UPDATE user SET email = '${email}' WHERE id = ${id}`;
        await connection.query(query2);
    });
}
module.exports = {
    cekLog,
};
