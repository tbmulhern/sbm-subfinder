const { neon } = require("@neondatabase/serverless");

const sql = neon("postgresql://neondb_owner:npg_Lf6w5DGlcZYx@ep-nameless-bar-aksiwxcn.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const { action, data } = JSON.parse(event.body || "{}");

  // Postgres time/date columns reject "" — empty form fields must become NULL.
  const t = v => (v === "" || v === undefined ? null : v);

  try {
    let result;

    switch (action) {
      // ── TEACHERS ──
      case "getTeachers":
        result = await sql`SELECT * FROM teachers ORDER BY name`;
        break;
      case "addTeacher":
        result = await sql`INSERT INTO teachers (name, classroom, phone, email, break_time_start, break_time_end, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end) VALUES (${data.name}, ${data.classroom}, ${data.phone}, ${data.email}, ${t(data.break_time_start)}, ${t(data.break_time_end)}, ${t(data.monday_start)}, ${t(data.monday_end)}, ${t(data.tuesday_start)}, ${t(data.tuesday_end)}, ${t(data.wednesday_start)}, ${t(data.wednesday_end)}, ${t(data.thursday_start)}, ${t(data.thursday_end)}, ${t(data.friday_start)}, ${t(data.friday_end)}) RETURNING *`;
        break;
      case "updateTeacher":
        result = await sql`UPDATE teachers SET name=${data.name}, classroom=${data.classroom}, phone=${data.phone}, email=${data.email}, break_time_start=${t(data.break_time_start)}, break_time_end=${t(data.break_time_end)}, monday_start=${t(data.monday_start)}, monday_end=${t(data.monday_end)}, tuesday_start=${t(data.tuesday_start)}, tuesday_end=${t(data.tuesday_end)}, wednesday_start=${t(data.wednesday_start)}, wednesday_end=${t(data.wednesday_end)}, thursday_start=${t(data.thursday_start)}, thursday_end=${t(data.thursday_end)}, friday_start=${t(data.friday_start)}, friday_end=${t(data.friday_end)} WHERE id=${data.id} RETURNING *`;
        break;
      case "deleteTeacher":
        result = await sql`DELETE FROM teachers WHERE id=${data.id} RETURNING *`;
        break;

      // ── SUBSTITUTES ──
      case "getSubs":
        result = await sql`SELECT * FROM substitutes ORDER BY name`;
        break;
      case "addSub":
        result = await sql`INSERT INTO substitutes (name, phone, email, opt_in_sms, available_days) VALUES (${data.name}, ${data.phone}, ${data.email}, ${data.opt_in_sms}, ${data.available_days || []}) RETURNING *`;
        break;
      case "updateSub":
        result = await sql`UPDATE substitutes SET name=${data.name}, phone=${data.phone}, email=${data.email}, opt_in_sms=${data.opt_in_sms}, available_days=${data.available_days || []} WHERE id=${data.id} RETURNING *`;
        break;
      case "deleteSub":
        result = await sql`DELETE FROM substitutes WHERE id=${data.id} RETURNING *`;
        break;

      // ── REQUESTS ──
      case "getRequests":
        result = await sql`SELECT * FROM requests ORDER BY created_at DESC`;
        break;
      case "addRequest": {
        const sameDay = await sql`SELECT id FROM requests WHERE date=${data.date}`;
        if (sameDay.length >= 3) {
          return { statusCode: 409, headers, body: JSON.stringify({ error: "limit reached" }) };
        }
        result = await sql`INSERT INTO requests (teacher_id, teacher_name, classroom, break_time, date, time, notes, status, reason, reason_detail, notify_subs) VALUES (${data.teacher_id}, ${data.teacher_name}, ${data.classroom}, ${data.break_time}, ${data.date}, ${data.time}, ${data.notes}, 'open', ${data.reason}, ${data.reason_detail}, ${JSON.stringify(data.notify_subs || [])}::jsonb) RETURNING *`;
        break;
      }
      case "acceptRequest":
        result = await sql`UPDATE requests SET status='filled', accepted_by=${data.accepted_by} WHERE id=${data.id} RETURNING *`;
        break;
      case "deleteRequest":
        result = await sql`DELETE FROM requests WHERE id=${data.id} RETURNING *`;
        break;
      case "clearRequests":
        result = await sql`DELETE FROM requests RETURNING *`;
        break;

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};