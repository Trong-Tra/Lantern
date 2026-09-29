# LATTERN — Website Design Specification

> Tài liệu mô tả thiết kế đang được triển khai trong `apps/web`, đối chiếu mã nguồn ngày 29/09/2026. Ngôn ngữ tài liệu: tiếng Việt; nội dung giao diện: tiếng Anh. Đây là bản ghi nhận từ code, không phải kết quả kiểm chứng bằng screenshot hoặc audit accessibility trên trình duyệt.

## 1. Định hướng thiết kế

Lattern là một trải nghiệm landing page điện ảnh, kể chuyện bằng thao tác cuộn về **identity, reputation và trust của AI agents**. Thông điệp chính: **“Illuminate the agent economy.”**

Ngôn ngữ thị giác kết hợp nền đen ấm, ánh sáng hổ phách, chất liệu lồng đèn và đồ thị công nghệ. Cảm giác cần giữ: tĩnh, có chiều sâu, tinh tế và dễ đọc; không phải dashboard dày đặc hay giao diện neon rực toàn màn hình.

Các nguyên tắc rút ra từ triển khai hiện tại:

- **Ánh sáng giải thích câu chuyện:** bật đèn, tìm agent, nhận diện tín hiệu, chọn đường đi, thực thi và kết nối mạng lưới.
- **Nội dung luôn ưu tiên hơn hiệu ứng:** hạt sáng, halo và lồng đèn phải nhường vùng đọc.
- **Một điểm nhấn cho mỗi cảnh:** headline, metadata, route hoặc CTA; không làm tất cả cùng sáng mạnh.
- **Khoảng trống là thành phần bố cục:** phần lớn câu chuyện dùng chữ ngắn và minh họa lớn, không bọc mọi nội dung trong card.
- **Minh bạch về bản demo:** dữ liệu minh họa, không giả lập trạng thái đã kết nối ví hoặc giao dịch thật.

## 2. Phạm vi và nguồn chuẩn

Trang đang chạy được xác định bởi [page.tsx](src/app/page.tsx), render `LatternExperience` từ [container chính](src/containers/lattern/index.tsx). [Layout](src/app/layout.tsx) nạp `src/styles/lattern.css`.

Không dùng các nhóm mã cũ như `src/containers/home`, `src/components/experience`, `src/components/lantern` hoặc bảng màu trong `src/styles/globals.scss` làm chuẩn cho landing page này. Ví dụ, nền tím `#050308` và token `filament` trong stylesheet cũ không phải nền đang được layout hiện tại sử dụng. Tương tự, button atom cũ không quyết định diện mạo nút Connect Wallet mới.

Tài liệu này mô tả trạng thái đã triển khai. Phần checklist cuối tài liệu là tiêu chí cần kiểm tra khi thay đổi thiết kế, không phải tuyên bố mọi tiêu chí đã được kiểm thử trực quan.

## 3. Hệ màu và chất liệu

### 3.1. Màu giao diện đang dùng

| Vai trò | Giá trị trong code | Ứng dụng |
| --- | --- | --- |
| Nền chính / ink | `#090807` | Trang, lớp nền và gradient điều hướng |
| Nền cảnh 3D | `#080806` | Fog, renderer và lớp làm tối finale |
| Chữ mặc định / paper | `#efe8d8` | Foreground chung |
| Headline được chiếu sáng | `#f6ead6` | Lớp chữ sáng trong `LightRevealText` |
| Nội dung chính | `#d2c5ad` | Đoạn mô tả trong các cảnh |
| Nội dung phụ | `#988d7a` | Aside và metadata phụ |
| Kicker | `#be9d6d` | Số chương, nhãn nhỏ uppercase |
| Amber / lantern | `#ffc46b` | Focus outline, selection, ánh sáng nhấn |
| Route được chọn | `#e6bb76` | Trạng thái đường đi đáng tin cậy |
| Lịch sử thành công | `#bdcfab` | Dấu hiệu thành công xanh xám dịu |
| Lịch sử thất bại | `#bf8275` | Trạng thái thất bại đỏ đất |
| Monad trong danh sách | `#bca6eb` | Tầng nền tảng thứ năm |
| Monad trong sơ đồ | `#c2a5f5` / `#dbc8ff` | Hình học / nhãn tầng Monad |

Đây là bảng tổng hợp các giá trị thực tế, không phải toàn bộ đã được tổ chức thành CSS custom properties. Những màu có hậu tố alpha được dùng cho hairline, lớp kính, vùng tối và ánh sáng nhẹ.

### 3.2. Chất liệu

- **Nền:** đen ngả nâu, phủ vignette và grain SVG có opacity `0.035`.
- **Đường phân cách:** nét mảnh 1px màu amber với độ trong suốt thấp.
- **Lồng đèn 3D:** lụa `#e5c393`, phát sáng `#ffc075`, khung đồng `#80603a`, nan tối `#39241a`, tua `#a67944`.
- **Glass:** giới hạn ở nút Connect Wallet; nền trắng rất trong, blur 20px, saturation 180%, viền chuyển sắc và phản sáng theo con trỏ.
- **Product preview:** nền `stone-950/95`, viền amber mảnh; ưu tiên độ đọc rõ thay vì kính trong suốt.
- **Finale:** gradient vàng trên chữ và một lớp tối riêng sau nội dung; tránh phủ glow lên toàn bộ headline.

## 4. Typography

| Thành phần | Font | Quy cách desktop |
| --- | --- | --- |
| Body và UI | Geist | Nội dung chính 15px, weight 300, line-height 1.85 |
| Headline kể chuyện | Georgia, Times New Roman, serif | Thông thường `clamp(44px, 5.1vw, 82px)`, weight 400, line-height 1.07, tracking `-0.049em` |
| Kicker, số chương, metadata | JetBrains Mono | Kicker 9px, uppercase, tracking `0.18em` |
| Aside | Geist | 12px, line-height 1.85 |
| LATTERN ở finale | Syne | `clamp(72px, 10.5vw, 158px)`, weight 600, tracking `0.07em` |
| Tagline finale | Geist | `clamp(20px, 2.2vw, 30px)`, weight 500, line-height 1.4 |
| Nhãn sơ đồ infrastructure | Monospace | Desktop 12px; mô tả phụ 10px |

Font Geist, Syne và JetBrains Mono được nạp bằng `next/font/google`. Headline Georgia dùng font hệ thống. Không thay toàn bộ tiêu đề bằng Syne: sự đối lập giữa serif kể chuyện và sans-serif thương hiệu là một phần của thiết kế.

`LightRevealText` có hai lớp: chữ nền mờ và lớp chữ sáng tuyệt đối phía trên. Clip-path mở chữ theo scroll; mask ánh sáng dựa trên vị trí nguồn sáng. Lớp chữ trùng lặp mang `aria-hidden`. Finale bỏ mask ánh sáng và dùng gradient `#fff9eb → #f2d5a3 → #bd864a`.

## 5. Bố cục tổng thể

### 5.1. Desktop

- Vùng trải nghiệm cao `1000svh`, điều khiển một sân khấu cố định cao `100svh`; không phải 11 khối thông thường xếp liên tục trong chế độ cinematic.
- Canvas 3D cố định toàn màn hình; nội dung và các nút là DOM phía trên.
- Header cố định cao 112px, padding ngang `4.7vw`: logo trái, hai liên kết giữa, Connect Wallet phải.
- Cảnh thường có padding `115px 8.4vw 100px`; cột nội dung rộng `min(600px, 48vw)`.
- Soul, Discovery và Reputation dùng cột chữ 42%; cảnh Problem đảo chữ sang phải bằng `margin-left: 45%`.
- Product dùng cột chữ 29% và panel rộng `min(670px, 55vw)`, khoảng cách `5vw`; panel có scroll nội bộ.
- Finale căn giữa, vùng chữ tối đa 940px, padding trên 160px.
- Thanh dưới cố định gồm chương hiện tại, 11 điểm điều hướng, nút reading mode và đường tiến trình mảnh.

### 5.2. Phân lớp

Canvas, vignette và hiệu ứng nền nằm dưới nội dung. Grain dùng `z-index: 8`, controls `20`, header `30`. Modal dùng overlay `90` và nội dung `100`. Các lớp trang trí không nhận pointer event; chỉ vùng giao diện tương tác nhận click.

Không đưa nhãn thiết yếu vào texture raster. Nhãn sơ đồ dùng DOM qua Drei `Html`; nội dung tĩnh tương ứng được giữ trong cấu trúc trang khi có fallback.

## 6. Storyboard 11 section

Khoảng tiến trình là giá trị chuẩn hóa `0–1` của toàn bộ hành trình scroll, không phải thời lượng giây. Thứ tự hiện tại lấy từ [lattern-scenes.ts](src/constants/lattern-scenes.ts).

| Section | ID / tiến trình | Headline | Vai trò thị giác và nội dung |
| --- | --- | --- | --- |
| 01 | `darkness` · 0–0.08 | AI agents are everywhere. | Mở đầu tối, khoảng trống lớn, mạng agent chưa rõ, lời mời scroll |
| 02 | `ignition` · 0.08–0.16 | Trust shouldn't be a leap in the dark. | Lồng đèn bắt sáng, giới thiệu Lattern và ánh sáng dẫn đường |
| 03 | `problem` · 0.16–0.27 | Anyone can create an agent. | Nội dung bên phải, đặt câu hỏi về chất lượng và độ tin cậy |
| 04 | `soul` · 0.27–0.38 | Some agents have a soul. | Trình bày Identity, Reputation, History quanh lõi agent |
| 05 | `discover` · 0.38–0.49 | See who you're dealing with. | Metadata agent rõ dần: identity, reputation, executions/failures, soul |
| 06 | `reputation` · 0.49–0.60 | Trust isn't claimed. It's earned. | Lịch sử Swap, Payment, Bridge, Execution, Trade và trạng thái kết quả |
| 07 | `path` · 0.60–0.72 | Don't guess the path. | Ý định Swap MON → USDC, loại các nhánh thiếu tin cậy, chọn trusted route |
| 08 | `execution` · 0.72–0.82 | Find. Verify. Execute. | Trình tự từ user intent đến authorization, settlement và confirmed |
| 09 | `monad` · 0.82–0.90 | Agents operate at machine speed. | Sơ đồ hạ tầng 5 tầng, tín hiệu đi xuống Monad |
| 10 | `product` · 0.90–0.96 | Ask Lattern. | Demo nhập intent, khám phá agent, xem profile và mô phỏng execution |
| 11 | `finale` · 0.96–1 | LATTERN | Kết thương hiệu, tagline, CTA Launch Lattern và thông tin chưa công bố |

### Các chi tiết không được mất khi thiết kế lại

- **Discovery:** metadata chuyển từ blur 6px / brightness 0.55 sang blur 0 / brightness 1 trong khoảng 0.38–0.435, giữ rõ rồi thoát ở 0.48–0.49. Giảm đốm nền bên **trái**, không đảo sang phải.
- **Path:** ba nhánh `Unverified agent`, `Poor execution history`, `Unknown reputation` hiện lần lượt và giữ lại cho đến khi cùng biến mất. Node, line và label của từng nhánh dùng chung mức reveal. Nhãn loại trừ trên graph không có hộp nền.
- **Path checklist bên trái:** hiện từ trên xuống; `Trusted route illuminated` là dòng cuối, không hiển thị cố định ngay từ đầu.
- **Intent trên graph:** ban đầu hạ thấp, chỉ nâng lên sau khi cả ba nhãn loại trừ đã biến mất.
- **Infrastructure:** các tầng Agent network → Lattern identity → Reputation layer → Execution layer → Monad; outline dạng hình thoi, node giữa, spine dọc và mũi tên đi xuống. Tầng đã sáng giữ nguyên khi tầng kế tiếp xuất hiện.
- **Infrastructure timing:** tầng `i` bắt đầu ở `0.822 + i × 0.012`, reveal trong `0.009`; đoạn nối tới tầng sau hoàn tất ngay trước khi tầng đó sáng. Danh sách bên trái và sơ đồ dùng chung helper thời gian.

## 7. Component và tương tác

### 7.1. Header và Connect Wallet

Logo là SVG `LatternMark` kèm wordmark LATTERN. Logo đưa về đầu; “The trust layer” và “How it works” nhảy tới các mốc tương ứng trong câu chuyện.

Nút bên phải là **Connect Wallet**, không phải Launch Lattern. Thiết kế được chuyển thể từ tham chiếu Light Glass của Originkit:

- Desktop: padding `8px 16px`, min-height 40px, radius 40px, chữ 13px/500.
- Nền `#ffffff0e`, viền `#ffffff30`, highlight chuyển sắc và inset shadow.
- Icon outline 16px, stroke 1.7: Wallet bên trái, ArrowRight bên phải khi hover/focus.
- Slot icon chuyển giữa 24px và 0px; chữ dịch chuyển theo slot nhưng tổng độ rộng không đổi.
- Hover scale 1.02, active scale 0.96; chuyển icon 280ms, opacity 180ms, sheen 200ms.
- Animation dùng CSS transitions với easing có độ bật nhẹ; **không dùng Framer Motion hoặc Lucide** trong triển khai hiện tại. Icon lấy từ Heroicons.
- Ánh sáng đi theo pointer qua `--glass-x` / `--glass-y`; bỏ tracking trên touch và reduced motion.
- Focus bàn phím cũng kích hoạt trạng thái icon; backdrop-filter không hỗ trợ thì dùng nền đặc `#24211d`.

Bấm nút mở Radix Dialog thông báo chưa có kết nối ví trong demo. Không gọi wallet provider, không hiện địa chỉ giả, không xin chữ ký. Modal nền tối, radius 16px, có icon ví, tiêu đề, mô tả, nút đóng và “Got it”.

### 7.2. CTA và nút thao tác

| Loại | Padding / kích thước | Hình thức |
| --- | --- | --- |
| Launch Lattern ở finale | `10px 18px`, min-height 44px, min-width 190px | Radius 8px; gradient `#ffe4b3 → #e5bc7d`, chữ `#21160b`, icon cách chữ 24px |
| Illuminate Path | `px-3 py-2`, desktop `sm:px-4`, min-height 44px | Nền amber-200, chữ stone-950, radius 8px |
| Execute with Agent | `px-3 py-2`, min-height 44px | Viền amber, nền nhẹ khi hover, radius 8px |
| Primary action trong agent dialog | `px-4 py-2`, min-height 44px | Nền amber-200, radius 8px |

CTA finale hover nâng 2px và tăng shadow, đưa người dùng về demo ở tiến trình 0.929 rồi focus ô nhập intent. Các nút dạng liên kết và chấm chuyển chương giữ hình thức tối giản; không áp dụng pill glass cho mọi control.

GitHub và View Contracts là thông tin tĩnh với nhãn **“Not published yet”**, chưa phải liên kết hoạt động.

### 7.3. Product preview

- Panel có tiêu đề “Lattern / Discovery” và badge “Interactive demo”.
- Textarea nhận intent; Enter submit, Shift+Enter xuống dòng và có kiểm tra IME composition.
- Ba nhóm demo: token swap, payment và bridge. Intent trống hoặc không hỗ trợ phải có thông báo rõ ràng.
- Kết quả hiển thị ba agent phù hợp, xếp theo reputation; row gồm glyph, tên, identity/soul, executions và điểm reputation.
- Agent được chọn có nền amber nhẹ và `aria-pressed`; trạng thái chọn không chỉ phụ thuộc hover.
- View Agent mở profile; Execute with Agent mở luồng mô phỏng nhiều bước trong modal.
- Luôn giữ thông báo dữ liệu hư cấu, không kết nối ví và không có giao dịch thật. Không biến bước “confirmed” trong demo thành bằng chứng settlement onchain.
- Modal dùng Radix, quản lý focus và tạm dừng smooth scroll khi mở.

## 8. Chuyển động và hệ ánh sáng

### 8.1. Timeline chung

Một playhead scroll điều khiển cả camera, lồng đèn, đồ thị và nội dung. Lenis dùng `lerp: 0.085`; GSAP ScrollTrigger dùng `scrub: 0.65`. Nhảy chương bằng Lenis có duration 1.3 giây.

Cảnh vào bằng opacity và translateY tối đa 18px; nội dung có `data-sequence` vào bằng translateY tối đa 12px. Reveal dùng `smoothstep`. Cuộn ngược phải khôi phục đúng trạng thái trước, không khởi chạy lại chuỗi timer độc lập.

Chỉ chương hiện tại được tương tác; chương khác có `visibility: hidden`, opacity 0, `inert` và `aria-hidden`. Finale fade-in rồi giữ hiển thị ở cuối trang, không fade-out về nền trống.

### 8.2. Cảnh 3D

Renderer dùng Three.js / React Three Fiber và Drei. Lồng đèn đang chạy là geometry procedural với thân lụa, 16 nan, chi tiết đồng và tua; không lấy ảnh tham chiếu cũ hay component lotus cũ làm mô tả chính xác của mesh hiện tại.

Mạng agent, lõi soul, trust path, infrastructure và hạt khí quyển được dựng thành các lớp riêng. Hạt sáng chỉ đóng vai trò chiều sâu; các điểm sáng có nghĩa nghiệp vụ phải gắn với node, route hoặc bước đang được giải thích.

### 8.3. Bảo vệ vùng đọc

| Cảnh | Xử lý nền và ánh sáng |
| --- | --- |
| Discovery | Giảm tối đa 96% mức hiển thị nền bên trái trong vùng focus |
| Reputation | Thu nhỏ và nâng lồng đèn khỏi khu vực lịch sử, giảm emissive/halo khi đọc |
| Path | Dồn cụm nền về khoảng 24% mép phải viewport, làm dịu nền dưới nhãn route; cập nhật cả node và line để không lệch nhau |
| Execution / Monad | Giảm mức hiển thị backdrop 95% tại focus đầy đủ; đưa lồng đèn lên trên và thu nhỏ |
| Finale | Trung tâm giữ hệ số hiển thị nền 0.015, hai rìa tối đa 0.22; mobile dùng 0.015 toàn vùng. Có scrim tối sau chữ và giảm beam của lồng đèn |

Các tỷ lệ trên là hệ số áp dụng trong code, không phải số đo độ sáng màn hình. Phải kiểm tra hình ảnh thực tế sau khi chỉnh shader, exposure hoặc camera.

Finale giữ ánh sáng ngoại vi để kết nối với thông điệp mạng lưới, nhưng headline và CTA phải là điểm sáng thị giác chính. Không tăng glow toàn cảnh để làm section nổi bật.

## 9. Responsive

| Điều kiện | Thay đổi chính |
| --- | --- |
| Từ 1700px | Giới hạn khoảng bố cục bằng padding `max(8vw, (100vw - 1500px) / 2)` |
| Tối đa 1024px | Padding cảnh 6vw; thu khoảng cách nav; cột chữ mặc định 52% |
| Tối đa 767px | Header 82px; ẩn nav giữa; chữ full-width; phần lớn cảnh căn nội dung xuống dưới; giảm kích thước 3D |
| Chiều cao tối đa 700px | Giảm headline, khoảng cách và padding finale; có xử lý riêng desktop/mobile |

Mobile dùng headline thường `clamp(34px, 9.6vw, 54px)`, copy 12px và aside 10px. Finale vẫn căn giữa, headline `clamp(44px, 12vw, 82px)` trước khi áp dụng quy tắc màn hình thấp.

Connect Wallet dùng padding `6px 12px`, chữ 11px và min-height 44px. CTA finale vẫn gọn, không kéo full-width mặc định. Product chuyển thành bố cục dọc; ẩn copy/aside của cảnh product để ưu tiên panel, panel cuộn trong `calc(100svh - 240px)`.

Không chỉ co tỷ lệ desktop: vị trí lồng đèn, camera, sơ đồ và mật độ hạt có cấu hình mobile riêng.

## 10. Accessibility, fallback và hiệu năng

### Trạng thái hiện có

- Có skip link tới demo; headline đầu là `h1`, các cảnh sau là `h2`.
- Focus outline amber; icon trang trí mang `aria-hidden`; chấm chương có tên truy cập và `aria-current`.
- `prefers-reduced-motion`, reading mode thủ công hoặc lỗi WebGL chuyển sang bản đọc tĩnh, không mount canvas.
- Reading mode đưa các section về normal flow, mở toàn bộ nội dung `data-sequence` và bỏ light mask; mỗi cảnh có min-height 85svh.
- JavaScript bị tắt có fallback riêng trong `noscript.scss`: ẩn canvas/loader/controls, hiển thị các section dạng tài liệu. Các chức năng demo tương tác vẫn cần JavaScript.
- Nếu cảnh không sẵn sàng sau 12 giây, chuyển sang fallback đọc thay vì giữ loading vô hạn.
- Giới hạn DPR: desktop 1.75, mobile 1.25. Agent node: 96/48; hạt khí quyển: 420/140 tương ứng desktop/mobile.
- Canvas lazy-load; node dùng instancing, buffer dùng lại và tài nguyên geometry/material được dispose khi unmount.

Các nút CTA chính có chiều cao tối thiểu 44px trên mobile. Điều này **không áp dụng cho mọi control hiện tại**: chấm chương mobile vẫn có button cao 18px. Contrast, target size và zoom cần được audit riêng; tài liệu không tuyên bố đạt chuẩn WCAG.

## 11. Quy tắc khi phát triển tiếp

- Giữ palette ấm; dùng tím như dấu hiệu tầng Monad, không làm màu nền chính cho toàn trang.
- Giữ serif cho storytelling, Syne cho wordmark cuối; tránh thay toàn bộ hệ chữ theo một component mẫu.
- Đặt vị trí text trước, rồi phân bổ lồng đèn và hạt vào khoảng trống còn lại.
- Đồng bộ label, node và line bằng cùng một tiến trình; tránh nhãn mất trước khi graph hoàn thành giải thích.
- Giữ chữ trên graph rõ khi đứng yên trong section; không làm chữ nhấp nháy theo ngọn đèn.
- Giữ nút nhỏ gọn: radius 8px cho action thông thường, pill 40px riêng Connect Wallet.
- Chỉ dùng ánh sáng theo pointer cho hover-capable device; luôn có trạng thái keyboard focus tương đương.
- Không thêm URL GitHub, contract, ví hay số liệu “live” khi chưa có nguồn chính thức.

## 12. Checklist bàn giao thiết kế

- [ ] Kiểm tra 11 cảnh khi cuộn xuống, cuộn ngược, nhảy chương và resize.
- [ ] Chữ không bị hạt, beam hoặc lồng đèn che ở Discovery, Path, Execution, Monad và Finale.
- [ ] Ba nhánh loại trừ trên graph hiện đúng thứ tự, giữ lại và biến mất cùng nhau.
- [ ] Sơ đồ infrastructure và danh sách 5 tầng khớp thời điểm.
- [ ] Connect Wallet không đổi kích thước tổng thể khi đổi icon; hover, focus, active và touch đều rõ ràng.
- [ ] Modal có thể đóng bằng bàn phím, trả focus đúng và không làm scroll nền bị kẹt.
- [ ] Demo có trạng thái empty, unsupported intent, selected agent, profile và simulated completion rõ ràng.
- [ ] Reading mode, reduced motion, lỗi WebGL và no-JavaScript vẫn đọc được câu chuyện.
- [ ] Kiểm tra màn hình mobile hẹp, desktop rộng, màn hình thấp và zoom; không chỉ kiểm tra một viewport.
- [ ] Chạy `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` khi sửa implementation; kiểm tra trực quan bổ sung cho CSS/WebGL.

## 13. Bản đồ mã nguồn

| Thiết kế cần sửa | Nguồn chính |
| --- | --- |
| Layout và font | [layout.tsx](src/app/layout.tsx) |
| Palette, spacing, nút, responsive | [lattern.css](src/styles/lattern.css) |
| Nội dung và mốc 11 cảnh | [lattern-scenes.ts](src/constants/lattern-scenes.ts) |
| Header, footer, cấu trúc cảnh, CTA | [LatternExperience](src/containers/lattern/index.tsx) |
| Connect Wallet và dialog demo | [connect-wallet-button.tsx](src/containers/lattern/components/connect-wallet-button.tsx) |
| Timeline scroll và DOM reveal | [use-cinematic-scroll.ts](src/containers/lattern/hooks/use-cinematic-scroll.ts) |
| Camera, vị trí và focus theo cảnh | [runtime.ts](src/libs/cinematic/runtime.ts) |
| Chữ được chiếu sáng | [light-reveal-text.tsx](src/components/animations/light-reveal-text.tsx) |
| Vật liệu và mesh lồng đèn | [cinematic-lantern](src/components/organisms/cinematic-lantern/index.tsx), [geometry.ts](src/components/organisms/cinematic-lantern/geometry.ts) |
| Tổ chức thế giới 3D | [world-scene.tsx](src/components/organisms/lattern-world/components/world-scene.tsx) |
| Sơ đồ infrastructure | [infrastructure.tsx](src/components/organisms/lattern-world/components/infrastructure.tsx), [timeline helper](src/libs/cinematic/infrastructure.ts) |
| Vùng đọc finale | [finale.ts](src/libs/cinematic/finale.ts) |
| Demo và agent dialog | [lattern-preview](src/components/organisms/lattern-preview/index.tsx) |
| Nội dung fallback từng cảnh | [scene-details.tsx](src/containers/lattern/components/scene-details.tsx) |
| Fallback không JavaScript | [noscript.scss](src/containers/lattern/noscript.scss) |
| Regression tests | [cinematic.test.mjs](tests/cinematic.test.mjs) |
