export async function handler(){

  const key = process.env.TWELVEDATA_API_KEY;

  if(!key){
    return { statusCode:500, body:"Missing API key" };
  }

  async function quote(sym){
    const r = await fetch(
      `https://api.twelvedata.com/quote?symbol=${sym}&apikey=${key}`
    );
    const j = await r.json();
    if(j.status==="error") throw new Error(j.message);
    return j;
  }

  try{
    const [spy,iau]=await Promise.all([
      quote("SPY"),
      quote("IAU")
    ]);

    return {
      statusCode:200,
      headers:{
        "content-type":"application/json",
        "cache-control":"public, max-age=300"
      },
      body:JSON.stringify({
        updated_iso:new Date().toISOString(),
        symbols:{
          SPY:{ price:Number(spy.price)||null },
          IAU:{ price:Number(iau.price)||null }
        }
      })
    };
  }catch(e){
    return { statusCode:500, body:String(e) };
  }
}
