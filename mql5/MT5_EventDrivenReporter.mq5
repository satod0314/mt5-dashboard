
#property strict
input string API_URL = "https://<your-supabase-functions-url>/ingest";
input string API_KEY = "YOUR_LONG_RANDOM_KEY";
input string OWNER_ID = "00000000-0000-0000-0000-000000000000";
input string TAG      = "deskA";
input int    HEARTBEAT_SEC = 60;
input bool   SEND_ON_BALANCE_CHANGE = true;
input double BALANCE_EPS  = 0.01;
input bool   SEND_ON_EQUITY_DELTA  = true;
input double EQUITY_DELTA_ABS = 10000.0;
input double EQUITY_DELTA_PCT = 0.0;
input int    MIN_COOLDOWN_SEC = 2;

double  lastBalance = 0.0;
double  lastEquity  = 0.0;
datetime lastSent   = 0;

int OnInit(){ EventSetTimer(1); lastBalance=AccountInfoDouble(ACCOUNT_BALANCE); lastEquity=AccountInfoDouble(ACCOUNT_EQUITY); TrySend("init"); return(INIT_SUCCEEDED); }
void OnDeinit(const int reason){ EventKillTimer(); }

void OnTradeTransaction(const MqlTradeTransaction& trans,const MqlTradeRequest& request,const MqlTradeResult& result){
  if(!SEND_ON_BALANCE_CHANGE) return;
  double bal = AccountInfoDouble(ACCOUNT_BALANCE);
  if(MathAbs(bal - lastBalance) >= BALANCE_EPS){ TrySend("balance_change"); lastBalance = bal; lastEquity = AccountInfoDouble(ACCOUNT_EQUITY); }
}

void OnTimer(){
  datetime now = TimeCurrent();
  if(SEND_ON_EQUITY_DELTA){
    double eq = AccountInfoDouble(ACCOUNT_EQUITY);
    bool overAbs = (EQUITY_DELTA_ABS > 0 && MathAbs(eq - lastEquity) >= EQUITY_DELTA_ABS);
    bool overPct = false;
    if(EQUITY_DELTA_PCT > 0 && lastEquity != 0.0){ overPct = (MathAbs((eq - lastEquity)/lastEquity)*100.0 >= EQUITY_DELTA_PCT); }
    if(overAbs || overPct){ TrySend("equity_threshold"); lastEquity = eq; return; }
  }
  if(HEARTBEAT_SEC > 0 && (now - lastSent) >= HEARTBEAT_SEC){ TrySend("heartbeat"); lastBalance=AccountInfoDouble(ACCOUNT_BALANCE); lastEquity=AccountInfoDouble(ACCOUNT_EQUITY); }
}

void TrySend(string reason){ if((TimeCurrent() - lastSent) < MIN_COOLDOWN_SEC) return; SendSnapshot(reason); lastSent = TimeCurrent(); }

void SendSnapshot(string reason){
  long   login   = (long)AccountInfoInteger(ACCOUNT_LOGIN);
  string broker  = AccountInfoString(ACCOUNT_COMPANY);
  string ccy     = AccountInfoString(ACCOUNT_CURRENCY);
  double balance = AccountInfoDouble(ACCOUNT_BALANCE);
  double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
  double profit  = AccountInfoDouble(ACCOUNT_PROFIT);
  double margin  = AccountInfoDouble(ACCOUNT_MARGIN);
  long   tsUtc   = (long)TimeCurrent();

  string payload = "{";
  payload += "\"owner_id\":\""+OWNER_ID+"\",";
  payload += "\"account_login\":"+IntegerToString(login)+",";
  payload += "\"broker\":\""+broker+"\",";
  payload += "\"tag\":\""+TAG+"\",";
  payload += "\"currency\":\""+ccy+"\",";
  payload += "\"balance\":"+DoubleToString(balance,2)+",";
  payload += "\"equity\":"+DoubleToString(equity,2)+",";
  payload += "\"profit_float\":"+DoubleToString(profit,2)+",";
  payload += "\"margin\":"+DoubleToString(margin,2)+",";
  payload += "\"ts_utc\":"+IntegerToString(tsUtc)+",";
  payload += "\"reason\":\""+reason+"\"";
  payload += "}";

  char result[], post[];
  StringToCharArray(payload, post);
  string headers = "Content-Type: application/json\r\nx-api-key: "+API_KEY+"\r\n";
  ResetLastError();
  int res = WebRequest("POST", API_URL, headers, 10000, post, result);
  if(res == -1){ Print("WebRequest error: ", GetLastError()); } else { Print("Posted: ", CharArrayToString(result)); }
}
