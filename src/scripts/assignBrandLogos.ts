import mongoose from "mongoose";
import { connectToMongoDB } from "../database/mongodb";
import Brand from "../models/brand.model";

// Official logo images (Wikimedia Commons, hotlinked — same pattern already
// used for product mainImage fields) matched by exact brand name.
const BRAND_LOGOS: Record<string, string> = {
    "Seagate": "https://upload.wikimedia.org/wikipedia/commons/7/7f/Seagate_logo.svg",
    "D-Link": "https://upload.wikimedia.org/wikipedia/commons/e/e2/D-Link_Logo_Blue_strap.svg",
    "Anker": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Anker_logo.svg",
    "JBL": "https://upload.wikimedia.org/wikipedia/commons/b/bc/JBL_logo.svg",
    "Canon": "https://upload.wikimedia.org/wikipedia/commons/0/0a/Canon_wordmark.svg",
    "Acer": "https://upload.wikimedia.org/wikipedia/commons/0/00/Acer_2011.svg",
    "Xiaomi": "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_(2021-).svg",
    "Western Digital": "https://upload.wikimedia.org/wikipedia/commons/9/9c/WD_Logo.svg",
    "Nikon": "https://upload.wikimedia.org/wikipedia/commons/f/f3/Nikon_Logo.svg",
    "HP": "https://upload.wikimedia.org/wikipedia/commons/0/05/HP_logo_2025.svg",
    "Vivo": "https://upload.wikimedia.org/wikipedia/commons/1/13/Vivo_logo_2019.svg",
    "Realme": "https://upload.wikimedia.org/wikipedia/commons/e/e6/Realme_logo_SVG.svg",
    "OPPO": "https://upload.wikimedia.org/wikipedia/commons/0/0a/OPPO_LOGO_2019.svg",
    "MSI": "https://upload.wikimedia.org/wikipedia/commons/9/91/Micro-Star_International_logo.svg",
    "Logitech": "https://upload.wikimedia.org/wikipedia/commons/1/17/Logitech_logo.svg",
    "OnePlus": "https://upload.wikimedia.org/wikipedia/commons/f/f8/OP_LU_Reg_1L_RGB_red_copy-01.svg",
    "Corsair": "https://upload.wikimedia.org/wikipedia/commons/2/2c/Corsair_2020_logo.svg",
    "Kingston": "https://upload.wikimedia.org/wikipedia/en/9/98/Kingston_Technology_Corporation_logo.svg",
    "Belkin": "https://upload.wikimedia.org/wikipedia/commons/9/92/Belkin_logo_2024.svg",
    "ASUS": "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg",
    "Netgear": "https://upload.wikimedia.org/wikipedia/commons/2/29/Netgear_logo_2014.svg",
    "SanDisk": "https://upload.wikimedia.org/wikipedia/commons/5/5f/SanDisk_2024_logo.svg",
    "TP-Link": "https://upload.wikimedia.org/wikipedia/commons/d/d0/TPLINK_Logo_2.svg",
    "Dell": "https://upload.wikimedia.org/wikipedia/commons/1/18/Dell_logo_2016.svg",
    "Bose": "https://upload.wikimedia.org/wikipedia/commons/0/0c/Bose_logo.svg",
    "Nothing": "https://upload.wikimedia.org/wikipedia/commons/3/30/Nothing.svg",
    "Razer": "https://upload.wikimedia.org/wikipedia/commons/5/52/Razer_wordmark.svg",
    "Lenovo": "https://upload.wikimedia.org/wikipedia/commons/c/c9/Lenovo_(2015).svg",
    "Apple": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    "Samsung": "https://upload.wikimedia.org/wikipedia/commons/b/b7/Samsung_Black_icon.svg",
    "Sony": "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg",
    "GoPro": "https://upload.wikimedia.org/wikipedia/commons/6/67/GoPro_logo_light.svg",
    "Google": "https://upload.wikimedia.org/wikipedia/commons/e/ee/Google_2026_logo.svg",
};

async function assignBrandLogos() {
    await connectToMongoDB();

    const brands = await Brand.find();
    console.log(`Checking ${brands.length} brands`);

    let assigned = 0;
    let missing = 0;

    for (const brand of brands) {
        const logo = BRAND_LOGOS[brand.name];
        if (!logo) {
            console.log(`No logo mapped for "${brand.name}"`);
            missing++;
            continue;
        }
        await Brand.updateOne({ _id: brand._id }, { $set: { image: logo } });
        console.log(`"${brand.name}" -> ${logo}`);
        assigned++;
    }

    console.log(`Done. Assigned ${assigned}, missing mapping for ${missing}.`);
}

assignBrandLogos()
    .then(() => {
        mongoose.connection.close();
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
