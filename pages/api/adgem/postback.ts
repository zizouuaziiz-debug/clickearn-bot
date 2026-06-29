import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      user_id,
      amount,
      transaction_id,
      offer_id,
      signature
    } = req.query;

    // 1. تحقق بسيط (لاحقاً نضيف security)
    if (!user_id || !amount || !transaction_id) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // 2. TODO: منع التكرار (transaction_id)

    // 3. TODO: جلب المستخدم من قاعدة البيانات
    // const user = await db.users.findUnique({ where: { telegram_id: user_id } })

    // 4. TODO: إضافة الرصيد للمحفظة
    // await db.wallet.update(...)

    // 5. TODO: تسجيل العملية
    console.log("AdGem postback:", {
      user_id,
      amount,
      transaction_id,
      offer_id
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}
