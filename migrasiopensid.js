const simpleGit = require('simple-git');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { chromium } = require('playwright');
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');

const sourceCodePath = 'J:/Opendesa/OpenSID';
const logpath = path.join(sourceCodePath, "storage", "logs");
const git = simpleGit(sourceCodePath);
const { exec } = require('child_process'); // Tambahkan ini di atas
const semver = require('semver');

const { cekLog } = require("./perbaikidata");


const http = require('http');

const php74 = `"C:\\laragon\\bin\\php\\php-7.4.33-Win32-vc15-x64\\php.exe"`;
const php81 = `"C:\\laragon\\bin\\php\\php-8.1.10-Win32-vs16-x64\\php.exe"`;

const processes = [
    {
        name: 'PHP 7.4',
        cmd: php74,
        args: ['-S', 'localhost:81', '-t', sourceCodePath],
        port: 81
    },
    {
        name: 'PHP 8.1',
        cmd: php81,
        args: ['-S', 'localhost:82', '-t', sourceCodePath],
        port: 82
    }
];

// Konstanta untuk konfigurasi
const CONFIG = {
    rootPath: "J:\\Opendesa\\premium\\",
    localhost: "localhost",
    localUser: "root",
    mysqldumpPath: "C:\\laragon\\bin\\mysql\\mariadb-11.4.3-winx64\\bin\\mysqldump",
    downloadDir: 'G:\\restore\\siappakai',
    storageFrameworkPath: path.join("J:\\Opendesa\\premium\\", "storage", "framework"),
    logPath: path.join("J:\\Opendesa\\premium\\", "storage", "logs"),
    appkeyPath: path.join("J:\\Opendesa\\premium\\", "desa\\app_key"),
    databaseFilePath: path.join("J:\\Opendesa\\premium\\", "desa\\config", "database.php"),
    dbGabungan: "db_gabungan_premium",
    username: "afila",
    plainPassword: "333}5X.33"
};


async function waitForServer(port) {
    return new Promise((resolve, reject) => {
        const checkServer = () => {
            http.get(`http://localhost:${port}`, (res) => {
                if (res.statusCode === 200) {
                    resolve(); // Server sudah siap
                } else {
                    setTimeout(checkServer, 1000); // Cek lagi setelah 1 detik
                }
            }).on('error', (err) => {
                setTimeout(checkServer, 1000); // Cek lagi jika ada error
            });
        };
        checkServer();
    });
}

async function changeAppkey(connection, appkeyPath) {
    const getConfigAppkey = `SELECT * FROM config LIMIT 1`;
    const [tableConfig] = await connection.execute(getConfigAppkey);
    const appkey = tableConfig[0].app_key;
    fs.writeFileSync(appkeyPath, appkey, "utf-8");

}

async function clearStorageFramework(storageFrameworkPath) {
    if (fs.existsSync(storageFrameworkPath)) {
        try {
            fs.rmSync(storageFrameworkPath, { recursive: true, force: true });
            console.log(`Folder '${storageFrameworkPath}' telah berhasil dihapus.`);
        } catch (err) {
            console.error("Terjadi kesalahan saat menghapus folder:", err.message);
        }
    } else {
        console.log(`Folder '${storageFrameworkPath}' tidak ditemukan.`);
    }
}



async function startServers() {
    for (const proc of processes) {
        const child = spawn(proc.cmd, proc.args, { shell: true });

        child.stdout.on('data', (data) => {
            // console.log(`[${proc.name}] ${data}`);
        });

        child.stderr.on('data', (data) => {
            // console.error(`[${proc.name} ERROR] ${data}`);
        });

        child.on('exit', (code) => {
            console.log(`[${proc.name}] exited with code ${code}`);
        });

        // Tunggu server berjalan sebelum lanjut
        console.log(`Menunggu ${proc.name} untuk berjalan di port ${proc.port}...`);
        // await waitForServer(proc.port);
        // console.log(`${proc.name} sudah berjalan di port ${proc.port}`);
    }
}
async function runPHPVersions() {
    const php74 = `"C:\\laragon\\bin\\php\\php-7.4.33-Win32-vc15-x64\\php.exe" -S localhost:81 -t ${sourceCodePath}`;
    const php81 = `"C:\\laragon\\bin\\php\\php-8.1.10-Win32-vs16-x64\\php.exe" -S localhost:82 -t ${sourceCodePath}`;

    const processes = [
        { name: 'PHP 7.4', cmd: php74 },
        { name: 'PHP 8.1', cmd: php81 }
    ];

    for (const proc of processes) {
        const child = exec(proc.cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Gagal menjalankan ${proc.name}: ${error.message}`);
                return;
            }
        });

        child.stdout.on('data', (data) => {
            console.log(`[${proc.name}] ${data}`);
        });

        child.stderr.on('data', (data) => {
            console.error(`[${proc.name} ERROR] ${data}`);
        });
    }
}

async function updateDatabaseConfig(databaseName) {
    const configPath = path.join(sourceCodePath, 'desa/config/database.php');
    console.log('configPath');
    console.log(configPath);
    if (fs.existsSync(configPath)) {
        let fileContent = fs.readFileSync(configPath, "utf-8");
        fileContent = fileContent.replace(/\$db\['default'\]\['password'\].*?;/, `$db['default']['password'] = '';`);
        fileContent = fileContent.replace(/\$db\['default'\]\['database'\].*?;/, `$db['default']['database'] = '${databaseName}';`);
        fs.writeFileSync(configPath, fileContent, "utf-8");
        console.log(`File database.php berhasil diperbarui.`);
    } else {
        console.error(`File database.php tidak ditemukan di ${configPath}`);
    }

}

async function openBrowser(tag, connection) {
    let cleanTag = tag.replace(/^v/, '');
    cleanTag = cleanTag.replace(/\.0\.0$/, "");
    cleanTag = cleanTag.replace(/\./g, "");
    versi = Number(cleanTag);


    await perbaikan(versi, connection);

    const isNewVersion = (versi >= 2407);
    const port = isNewVersion ? 82 : 81;
    const phpVersion = isNewVersion ? '8.1' : '7.4';
    const url = `http://localhost:${port}/index.php/siteman`;
    await cekLog(sourceCodePath, connection);
    console.log(`📦 Versi ${tag} menggunakan PHP ${phpVersion}`);
    // console.log(`🌐 Membuka ${url}...`);

    const test = await chromium.launch({
        headless: false, // tampilkan browser
        args: [
            '--disable-cache',               // nonaktifkan cache (meskipun tidak resmi)
            '--disable-application-cache',
            '--disk-cache-size=0',
            '--media-cache-size=0'
        ],
        ignoreDefaultArgs: ['--enable-automation'] // opsional: agar lebih "natural"
    });
    const browser = await test.newContext(); // context baru = incognito
    const page = await browser.newPage();
    try {
        console.log(`  Membuka ${url} untuk versi ${tag}...`);

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 300000, // perpanjang timeout
        });
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 300000, // perpanjang timeout
        });

        await page.waitForLoadState('networkidle');
        // Cek apakah halaman diarahkan ke konfigurasi database
        const currentUrl = page.url();
        if (currentUrl.includes('/index.php/koneksi_database/config')) {
            console.log('Halaman dialihkan ke konfigurasi database.');
            const appkeyPath = path.join(sourceCodePath, 'desa\\app_key');
            await changeAppkey(connection, appkeyPath);

            const storageFrameworkPath = path.join(sourceCodePath, "storage", "framework");
            await clearStorageFramework(storageFrameworkPath)

            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 300000, // perpanjang timeout
            });
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 300000, // perpanjang timeout
            });
        }

        await page.waitForLoadState('networkidle');
        // cek log terlebih dahulu sebelum migrasi
        console.log('sedang melakukan pengecekan log')
        await cekLog(sourceCodePath, connection);



        console.log('manampilkan halaman login');
        await page.waitForSelector('input[name="username"]', { timeout: 30000 });
        await page.fill('input[name="username"]', 'afila');
        await page.fill('input[name="password"]', '7JZ}5X.2R3Pb');

        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const screenshotPath = `screenshot-login-${tag.replace(/[^\w]/g, '_')}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });

        await tutupModal(page);
        await migrasi(page);
        // cek log terlebih dahulu sebelum migrasi
        const cekerror = await cekLog(sourceCodePath, connection);

        // jika ada error, bersihkan dan lakukan migrasi ulang
        if (cekerror.length > 0) {
            await login(page, url);
            await migrasi(page);
        }
        console.log(`  Screenshot disimpan: ${screenshotPath}`);
    } catch (err) {
        console.warn(`  Gagal login atau screenshot: ${err.message}`);
    }

    await page.close(); // bisa ditutup jika mau

}

async function login(page, url) {
    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 300000, // perpanjang timeout
    });
    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 300000, // perpanjang timeout
    });
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('input[name="username"]', { timeout: 30000 });
    await page.fill('input[name="username"]', 'afila');
    await page.fill('input[name="password"]', '7JZ}5X.2R3Pb');

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
}

async function tutupModal(page) {
    try {
        console.log("Menunggu modal Selamat Datang tampil...");

        // Tunggu elemen modal dengan id "pengumuman" muncul (maksimal 10 detik)
        const modal = await page.waitForSelector('#pengumuman', { timeout: 10000, state: 'visible' });
        console.log("✅ Modal ditemukan dan terlihat.");

        // Tunggu tombol "Setuju" muncul dan terlihat
        const btnSetuju = await page.waitForSelector('#btnSetuju', { timeout: 3000, state: 'visible' });

        // Klik tombol "Setuju"
        await btnSetuju.click();
        console.log("✅ Tombol 'Setuju' diklik.");
    } catch (error) {
        console.log("⚠️ Modal tidak muncul dalam waktu yang ditentukan, lanjutkan eksekusi.");
    }
}

// Fungsi untuk mengecek apakah elemen memiliki anak
async function checkHasChildWithTimeout(element, timeout = 5000) {
    const hasChildPromise = element.evaluate(el => el.children.length > 0);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout exceeded')), timeout));

    // Menunggu salah satu dari kedua promise, baik hasil dari evaluate atau timeout
    return Promise.race([hasChildPromise, timeoutPromise])
        .then(result => result ? true : false)  // Mengembalikan true jika ada anak, false jika tidak
        .catch(() => false);  // Jika timeout atau error, kembalikan false
}

async function migrasi(page) {
    console.log('Masuk ke modul database...');

    const menuDb = await page.$('a[href*="database"]');
    await menuDb.evaluate(el => el.click());
    // await menudb.evaluate(el => el.click());

    console.log('Masuk ke modul migrasi...');
    const menuMigrasi = await page.waitForSelector('a[href*="migrasi_cri"]', { timeout: 10000 });
    await menuMigrasi.evaluate(el => el.click());
    console.log('Berhasil masuk ke modul migrasi');
    await page.waitForLoadState('networkidle');


    const tombolMigrasi = page.locator('.btn.ajax');
    console.log('tombolMigrasi:', tombolMigrasi);

    // const { databaseName } = await inquirer.prompt([
    //     {
    //         type: 'input',
    //         name: 'databaseName',
    //         message: 'Masukkan nama database:',
    //         validate: input => input.trim() !== '' ? true : 'Nama database tidak boleh kosong'
    //     }
    // ]);

    const hasChild = await checkHasChildWithTimeout(tombolMigrasi, 5000); // Timeout 5 detik
    console.log('has child:', hasChild);
    console.log(`page.locator('a.btn.ajax')`, page.locator('a.btn.ajax'));
    console.log(`page.locator('a.btn.ajax migrasi')`, !page.locator('a.btn.ajax.migrasi'));
    try {
        if (page.locator('a.btn.ajax') && !page.locator('a.btn.ajax.migrasi')) {
            console.log('Memulai Migrasi...');
            await page.click('a.btn.ajax');
            await page.waitForLoadState('networkidle');
            console.log('✅ Migrasi selesai...');

            // 5. (opsional) log URL
            console.log('🔗 URL sekarang:', page.url());
        } else if (page.locator('a.btn.ajax.migrasi')) {
            await page.click('a.btn.ajax');
            console.log('Click tombol konfirmasi selesai backup...');
            const swalConfirm = await page.waitForSelector('button.swal2-confirm', { timeout: 5000 });
            await swalConfirm.click();


            console.log('Tunggu swal migrasi muncul...');
            const swalTitle = await page.waitForSelector(
                "//h2[@class='swal2-title' and text()='Proses migrasi database, mohon ditunggu ']",
                { timeout: 5000, state: 'visible' }
            );
            console.log('Swal migrasi sudah muncul');

            console.log('Tunggu migrasi selesai muncul...');
            const migrasiOk = await page.waitForSelector('button.swal2-confirm', { timeout: 50000 });

            // Tunggu tombol terlihat
            await migrasiOk.waitForElementState('visible', { timeout: 5000 });

            // Tunggu tombol tidak disabled
            await page.waitForFunction(
                (el) => !el.hasAttribute('disabled'),
                migrasiOk,
                { timeout: 50000 }
            );

            console.log('Klik tombol selesai migrasi...');
            await migrasiOk.click();

            console.log('✅ Migrasi selesai...');
        } else {
            console.log('Menampilkan isian button migrasi...');
            const btnGroup = await page.waitForSelector('button.btn-group', { timeout: 5000 });
            await btnGroup.evaluate(el => el.classList.add('open'));

            console.log('Click tombol migrasi semua...');
            const semuaMigrasi = await page.waitForSelector('a.migrasi[data-migrasi="new"]', { timeout: 5000 });
            await semuaMigrasi.click();

            console.log('Click tombol konfirmasi selesai backup...');
            const swalConfirm = await page.waitForSelector('button.swal2-confirm', { timeout: 5000 });
            await swalConfirm.click();

            console.log('Tunggu swal migrasi muncul...');
            const swalTitle = await page.waitForSelector(
                "//h2[@class='swal2-title' and text()='Proses migrasi database, mohon ditunggu ']",
                { timeout: 5000, state: 'visible' }
            );
            console.log('Swal migrasi sudah muncul');

            console.log('Tunggu migrasi selesai muncul...');
            const migrasiOk = await page.waitForSelector('button.swal2-confirm', { timeout: 50000 });

            // Tunggu tombol terlihat
            await migrasiOk.waitForElementState('visible', { timeout: 5000 });

            // Tunggu tombol tidak disabled
            await page.waitForFunction(
                (el) => !el.hasAttribute('disabled'),
                migrasiOk,
                { timeout: 50000 }
            );

            console.log('Klik tombol selesai migrasi...');
            await migrasiOk.click();

            console.log('✅ Migrasi selesai...');
        }
    } catch (error) {
        console.log('error : ' + error);
    }




}


async function connectToDatabase(host, user, password) {
    return await mysql.createConnection({ host, user, password });
}

async function injekUser(localConnection) {
    const hashedPassword = await bcrypt.hash(CONFIG.plainPassword, 10);
    try {
        const [rows] = await localConnection.execute('SELECT * FROM user WHERE username = ?', ['afila']);
        console.log('cek user afila');
        console.log(rows);
        if (rows.length > 0) {
            // UPDATE password
            await localConnection.execute(
                'UPDATE user SET password = ? WHERE username = ?',
                [hashedPassword, 'afila']
            );
            console.log('  User "afila" sudah ada, password berhasil diupdate.');
        } else {
            const [columns] = await localConnection.execute('SHOW COLUMNS FROM user');
            const columnNames = columns.map(col => col.Field);

            // Data yang ingin dimasukkan
            const fullInsertData = {
                username: 'afila',
                password: hashedPassword,
                id_grup: 1,
                nama: 'afila Opendesa',
                email: 'afila@Opendesa.com',
                id_telegram: 0,
                active: 1,
                notif_telegram: 0,
                session: 0,
                foto: 'kuser.png',
                config_id: 1,
            };

            // Filter data berdasarkan kolom yang tersedia di database
            const insertData = {};
            for (const key in fullInsertData) {
                if (columnNames.includes(key)) {
                    insertData[key] = fullInsertData[key];
                }
            }
            console.log('  Data yang akan dimasukkan:', insertData);

            // Bangun query INSERT secara dinamis
            const keys = Object.keys(insertData);
            const placeholders = keys.map(() => '?').join(', ');
            const values = Object.values(insertData);

            const insertQuery = `INSERT INTO user (${keys.join(', ')}) VALUES (${placeholders})`;

            await localConnection.execute(insertQuery, values);
            console.log('✅ User "afila" berhasil ditambahkan sesuai kolom yang tersedia.');
        }
    } catch (err) {
        console.error(`  Gagal proses user "afila": ${err.message}`);
    }
}

async function killGitProcesses() {
    const psList = (await import('ps-list')).default;

    try {
        console.log('Mencari proses Git yang sedang berjalan...');

        const processes = await psList();
        const gitProcesses = processes.filter(p => p.name.toLowerCase() === 'git.exe');

        if (gitProcesses.length > 0) {
            console.log('Menemukan proses Git:');
            for (const proc of gitProcesses) {
                console.log(`PID: ${proc.pid}, Nama: ${proc.name}`);
                exec(`taskkill /PID ${proc.pid} /F`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Gagal menghentikan PID ${proc.pid}: ${error.message}`);
                    } else {
                        console.log(`Berhasil menghentikan PID ${proc.pid}`);
                    }
                });
            }
        } else {
            console.log('Tidak ada proses Git yang sedang berjalan.');
        }

    } catch (err) {
        console.error('Terjadi kesalahan:', err.message);
    }
}

// Fungsi untuk menghapus file index.lock
async function removeGitLockFile() {
    const gitRepoPath = sourceCodePath + '/.git'; // Ganti dengan path repositori Git kamu
    const lockFilePath = path.join(gitRepoPath, 'index.lock');

    if (fs.existsSync(lockFilePath)) {
        console.log('Ditemukan file index.lock, menghapusnya...');
        fs.unlinkSync(lockFilePath); // Hapus file index.lock
        console.log('File index.lock berhasil dihapus.');
    } else {
        console.log('File index.lock tidak ditemukan.');
    }
}

// Fungsi utama untuk menjalankan skrip
async function fixGitLockIssue() {
    await killGitProcesses(); // Hentikan proses Git yang sedang berjalan
    await removeGitLockFile(); // Hapus file index.lock
}

async function perbaikan($versi, connection) {
    if ($versi >= 2306) {

    }
    if ($versi >= 2312) {
        await perbaikiduplikasi(connection);
        await perbaikiKlasifikasiSurat(connection);
        await perbaikiidkk0(connection);
    }

    if ($versi >= 2401) {

    }
}

async function perbaikiduplikasi(connection) {
    // 1. Ambil semua slug yang duplikat
    const [duplicates] = await connection.execute(`
        SELECT url
        FROM setting_modul
        where url != ''
        GROUP BY url
        HAVING COUNT(*) > 1
      `);
    for (const row of duplicates) {
        const url = row.url;

        // 2. Ambil semua baris dengan slug duplikat, urut berdasarkan id ASC
        const [rows] = await connection.execute(
            `SELECT id FROM setting_modul WHERE url = ? ORDER BY id ASC`,
            [url]
        );

        // 3. Hapus semua id selain yang pertama
        const idsToDelete = rows.slice(1).map(r => r.id); // Sisakan yang pertama

        if (idsToDelete.length > 0) {
            await connection.execute(
                `DELETE FROM setting_modul WHERE id IN (${idsToDelete.join(',')})`
            );
            console.log(`Duplikat url '${url}' dihapus: ID ${idsToDelete.join(', ')}`);
        }
    }

    console.log('Pembersihan slug duplikat selesai.');
}
async function perbaikiKlasifikasiSurat(connection) {
    console.log('perbaiki table klasifikasi_surat...');
    const [rows] = await connection.execute(`
        SHOW COLUMNS FROM klasifikasi_surat LIKE 'config_id';
      `);

    if (rows.length === 0) {
        // Jika kolom 'config_id' tidak ada, tambahkan kolom
        await connection.execute(`
          ALTER TABLE klasifikasi_surat
          ADD COLUMN config_id INT NULL,
          ADD INDEX klasifikasi_surat_config_fk (config_id),
          ADD CONSTRAINT klasifikasi_surat_config_fk
            FOREIGN KEY (config_id) REFERENCES config(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE;
        `);
        console.log('Kolom config_id berhasil ditambahkan.');
    } else {
        console.log('Kolom config_id sudah ada.');
    }
}

async function perbaikiidkk0(connection) {
    console.log('perbaiki data id kk = 0...');
    const [columns] = await connection.execute(`
        SELECT IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = database() AND TABLE_NAME = 'tweb_penduduk' AND COLUMN_NAME = 'id_kk'
    `);


    if (columns.length != 0) {
        const tableName = 'tweb_penduduk';
        const columnName = 'id_kk';
        // 2. Cek apakah ada data dengan id_kk = 0
        const [countResult] = await connection.execute(`
            SELECT COUNT(*) AS count FROM ${tableName} WHERE ${columnName} = 0
        `);

        if (countResult[0].count != 0) {
            console.log(`ada data dengan ${columnName} = 0 pada ${tableName}`, `perlu diupdate.`);

            console.log('UPDATE ', tableName, ' SET ', columnName, ' = NULL WHERE ', columnName, ' = 0');
            // Jika NULL diperbolehkan, lanjut update
            const [result] = await connection.execute(`
                UPDATE ${tableName}
                SET ${columnName} = NULL
                WHERE ${columnName} = 0
            `);
        }

    }

}

async function main() {

    await startServers();
    try {
        if (!fs.existsSync(sourceCodePath)) {
            console.error('Path tidak ditemukan:', sourceCodePath);
            return;
        }

        // const { kodedesa } = await inquirer.prompt([
        //     {
        //         type: 'input',
        //         name: 'kodedesa',
        //         message: 'Masukkan kode desa (misal: 1101012001):',
        //         validate: input => /^[0-9]{10}$/.test(input) ? true : 'Harus 10 digit angka'
        //     }
        // ]);

        const { databaseName } = await inquirer.prompt([
            {
                type: 'input',
                name: 'databaseName',
                message: 'Masukkan nama database:',
                validate: input => input.trim() !== '' ? true : 'Nama database tidak boleh kosong'
            }
        ]);
        await fixGitLockIssue();
        console.log('menyambungkan ke database...');
        const localConnection = await connectToDatabase(CONFIG.localhost, CONFIG.localUser, "");
        console.log('  Berhasil menyambungkan ke database');

        // Pindah ke database 'desa'
        await localConnection.query('USE ' + databaseName);
        console.log('  Berhasil pindah ke database desa');

        // perbaiki primarykey
        // await setPrimarykey(localConnection);

        // injek user
        await injekUser(localConnection);
        // await perbaikiduplikasi(localConnection);
        const tags = (await git.tags()).all;
        console.log('tags')
        console.log(tags);
        // Sort tags by version
        const normalizeTag = (tag) => {
            if (/^v\d{2}\.\d{2}$/.test(tag)) {
                // v22.12
                return `20${tag.slice(1, 3)}${tag.slice(4).padStart(2, '0')}`;
            } else if (/^v\d{4}\.0\.0$/.test(tag)) {
                // v2306.0.0
                return `20${tag.slice(1, 2) === '0' ? tag.slice(1, 3) : tag.slice(1, 3)}${tag.slice(3, 5)}`;
            }
            return '';
        };
        const sortedTags = tags
            .map(t => ({ tag: t, normalized: normalizeTag(t) }))
            .filter(t => t.normalized)
            .sort((a, b) => a.normalized.localeCompare(b.normalized));


        const { versionTag } = await inquirer.prompt([
            {
                type: 'input',
                name: 'versionTag',
                message: 'Masukkan tag versi (misalnya: v22.12 atau v2306.0.0):',
                validate: input => tags.includes(input) ? true : 'Tag tidak ditemukan'
            }
        ]);

        console.log(`  Checkout ke ${versionTag}...`);
        await git.reset(['--hard']);
        await git.checkout(['-f', versionTag]);
        await updateDatabaseConfig(databaseName);
        await openBrowser(versionTag, localConnection);

        const currentIndex = sortedTags.findIndex(t => t.tag === versionTag);
        const latestTag = sortedTags[sortedTags.length - 1]?.tag;
        if (currentIndex !== -1) {
            const nextTags = sortedTags.slice(currentIndex);  // Start from the selected versionTag

            const semTag = nextTags.filter(({ tag }) => {

                if (tag === latestTag) {
                    return true;
                }
                if (/^v\d{2}\.\d{2}$/.test(tag)) {
                    const month = parseInt(tag.split('.')[1]);
                    return month === 6 || month === 12 || month === 1;
                } else if (/^v\d{4}\.0\.0$/.test(tag)) {
                    const month = parseInt(tag.slice(3, 5));
                    const year = parseInt(tag.slice(1, 3));

                    // if (year >= 23) {

                    //     return true;
                    // }
                    return month === 6 || month === 12 || month === 1;
                }

                // Tambahkan tag terbaru meskipun tidak cocok dengan pola bulan
                return false;
            });

            for (const { tag } of semTag) {
                await fixGitLockIssue();
                console.log(`  lakukan git reset --hard...`);
                await git.reset(['--hard']);
                console.log(`  Checkout ke ${tag}`);
                await git.checkout(['-f', tag]);
                // await updateDatabaseConfig(kodedesa);
                await openBrowser(tag, localConnection);
            }

            console.log('  Selesai checkout semua versi bulan 6 dan 12.');
        } else {
            console.log('  Tag yang dipilih tidak ditemukan dalam daftar tags.');
        }


    } catch (err) {
        console.error('  Terjadi error:', err.message);
    }
}

main();

