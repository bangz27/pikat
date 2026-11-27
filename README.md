# PIKAT · พิกัด

**ทุกบ้าน ทุกจุด ทุกพิกัด**: Address & Location Intelligence Platform for Last Mile Delivery.
Search, manage, verify, and map address locations.

MVP: React + TypeScript + Vite + Leaflet (OSM-compatible tiles) + Supabase (PostgreSQL/PostGIS).

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env.local   # ไม่ใส่ค่า Supabase = ใช้โหมด Local (localStorage)
npm run dev
```

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | type-check + production build (`dist/`) |
| `npm test` | unit + component tests (Vitest) |
| `npm run test:db` | apply migrations ลง PostgreSQL+PostGIS ชั่วคราวในเครื่อง แล้วรัน assertions (ต้องมี postgres + postgis ติดตั้งในเครื่อง, ไม่แตะฐานข้อมูลจริง) |
| `npm run test:e2e` | browser smoke test (Playwright) กับ `vite preview` ที่พอร์ต 4173 |

## ที่เก็บข้อมูล

- **Supabase**: ตั้ง `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` แล้ว apply migrations ใน `supabase/migrations/` (เช่น `supabase db push`)
- **Local fallback**: ถ้าไม่ตั้งค่า ข้อมูลจะเก็บใน localStorage ของเบราว์เซอร์นั้นเท่านั้น และ UI จะแสดงป้าย "Local" ไว้

ฝั่ง UI เรียกผ่าน `AddressRepository` (`src/data/repository.ts`) จึงเปลี่ยน backend ได้โดยไม่ต้องแก้ UI
การค้นหาผ่าน `SearchProvider` (`src/data/providers.ts`) ถ้าจะเพิ่มแหล่งข้อมูลใหม่ เช่น geocoder ที่มี license หรือข้อมูลทางการที่ได้รับอนุญาต ให้เขียน adapter แยก

## ฐานข้อมูล (`supabase/migrations`)

- `address_points`: `geom geography(Point,4326)` เป็น **generated column** จาก latitude/longitude ค่าจึงไม่มีทางไม่ตรงกัน มี GiST index
- มี CHECK constraints สำหรับช่วงพิกัด ปฏิเสธ (0,0) รหัสไปรษณีย์ 5 หลัก และสถานะการยืนยัน
- trigger ดูแล `updated_at` และ `verified_at` (มีค่าเฉพาะตอนสถานะเป็น verified)
- RPC: `nearby_address_points(lat, lng, radius_m)` และ `address_points_in_bbox(...)` สำหรับโหลดตาม viewport
- RLS เปิดไว้ ส่วน policy แบบ anon อยู่ในไฟล์แยก `*_mvp_anon_policies.sql` **ใช้สำหรับ MVP เท่านั้น** ใครมี anon key ก็อ่าน/เขียนได้ ต้องเปลี่ยนเป็น policy ที่ผูกกับการล็อกอินก่อนใช้ข้อมูลจริง

## นำเข้า CSV

คอลัมน์ที่ต้องมี: `house_no, latitude, longitude`
คอลัมน์เสริม: `village, soi, street, subdistrict, district, province, postal_code, landmark, source, notes` (ดูตัวอย่างที่ `samples/sample-fictional.csv`, ข้อมูลสมมติ)

- แถวที่พิกัดไม่ถูกต้องจะ**ไม่ถูกนำเข้า** แถวที่อยู่นอกประเทศไทยจะขึ้นคำเตือน
- ทุกแถวที่นำเข้าจะมีสถานะ **ยังไม่ยืนยัน** เสมอ
- **รายการซ้ำ**: ถือว่าซ้ำเมื่อ (1) ที่อยู่ตรงกันหลัง normalize (บ้านเลขที่+หมู่บ้าน+ซอย+ถนน+ตำบล+อำเภอ+จังหวัด) หรือ (2) บ้านเลขที่เดียวกันและห่างกันไม่เกิน 15 ม. ตรวจทั้งกับข้อมูลเดิมและแถวก่อนหน้าในไฟล์เดียวกัน ค่าเริ่มต้นคือ**ข้าม** ถ้าผู้ใช้ติ๊กเลือกเอง จะนำเข้าเป็นรายการใหม่ ไม่มีการเขียนทับของเดิม

## ชั้นข้อมูล

แผนที่ฐาน · จุดที่อยู่ที่บันทึก · จุดสังเกต · ตำแหน่งที่ยืนยันแล้ว แต่ละจุดอยู่ในชั้นเดียว (ยืนยันแล้ว > มีจุดสังเกต > จุดทั่วไป) ชั้นใหม่ในอนาคตเพิ่มได้ที่ `src/domain/layers.ts`

## ข้อมูลและการใช้ OSM

- ไม่มีชื่อผู้รับ เบอร์โทร หรือเลขพัสดุในระบบ
- ไม่ scrape หรือเชื่อมข้อมูลส่วนบุคคลหรือข้อมูลภาครัฐที่ไม่ได้รับอนุญาต
- ไม่ใช้ public Nominatim
- Tile server ตั้งค่าผ่าน env (`VITE_TILE_URL`, `VITE_TILE_ATTRIBUTION`) ค่าเริ่มต้นคือ tile.openstreetmap.org ซึ่ง**ไม่เหมาะกับ production** ([นโยบาย](https://operations.osmfoundation.org/policies/tiles/)) ต้องเปลี่ยนไปใช้ผู้ให้บริการที่รองรับก่อนเปิดใช้จริง

## Deploy

มี `vercel.json` เตรียมไว้แล้ว ยังไม่ได้ deploy
