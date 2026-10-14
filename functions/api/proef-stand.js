// VISUAILS — GET /api/proef-stand: staat de €1-proef open, dicht, of alleen
// lifestyle? 8 oktober 2026 (G2).
//
// /test-sample is een statische pagina; zij vraagt de stand hier op en toont dan
// "Even niet beschikbaar" met het veld voor de wachtlijst (zie
// functions/api/proef-wachtlijst.js). Wat de pagina zegt is gemak: de echte rem
// staat in /api/order, die een proef weigert die dicht is. Zie
// src/lib/proefStand.js voor de keuzes.
import { leesProefStand } from '../../src/lib/proefStand.js';

export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({ stand: await leesProefStand(env) }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
