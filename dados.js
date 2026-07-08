// Carrega os produtos direto das abas publicadas do Google Sheets (CSV).
// Se os links ainda não foram configurados em config.js, ou se o Google
// Sheets estiver fora do ar por algum motivo, cai automaticamente para o
// arquivo produtos.json local (a última versão salva no repositório).

function linksConfigurados(){
  return (
    typeof CADASTRO_CSV_URL === 'string' &&
    typeof ENDERECO_CSV_URL === 'string' &&
    !CADASTRO_CSV_URL.includes('COLE_AQUI') &&
    !ENDERECO_CSV_URL.includes('COLE_AQUI')
  );
}

function celula(valor){
  return (valor === undefined || valor === null) ? '' : String(valor).trim();
}

function montarProdutos(cadastroRows, enderecoRows){
  const cadastroMap = {};
  cadastroRows.slice(2).forEach(r => {
    const codigo = celula(r[0]);
    if(!codigo) return;
    cadastroMap[codigo] = { descricao: celula(r[1]), imagem: celula(r[2]) };
  });

  const produtosMap = {};
  enderecoRows.slice(2).forEach(r => {
    const codigo = celula(r[0]);
    if(!codigo) return;

    const endereco = {
      zona: celula(r[2]) || null,
      rua: celula(r[3]) || null,
      bloco: celula(r[4]) || null,
      nivel: celula(r[5]) || null,
      posicao: celula(r[6]) || null,
      almoxarifado: celula(r[7]) || null
    };

    if(!produtosMap[codigo]){
      const info = cadastroMap[codigo] || {};
      produtosMap[codigo] = {
        codigo,
        descricao: info.descricao || '',
        imagem: info.imagem || '',
        enderecos: []
      };
    }
    produtosMap[codigo].enderecos.push(endereco);
  });

  return Object.values(produtosMap);
}

async function buscarCsv(url){
  const resposta = await fetch(url, { cache: 'no-store' });
  if(!resposta.ok) throw new Error(`Não foi possível ler a planilha (status ${resposta.status})`);
  const texto = await resposta.text();
  return Papa.parse(texto, { skipEmptyLines: true }).data;
}

async function carregarProdutosDoGoogleSheets(){
  const [cadastroRows, enderecoRows] = await Promise.all([
    buscarCsv(CADASTRO_CSV_URL),
    buscarCsv(ENDERECO_CSV_URL)
  ]);
  return montarProdutos(cadastroRows, enderecoRows);
}

async function carregarProdutosLocal(){
  const res = await fetch('produtos.json', { cache: 'no-store' });
  return res.json();
}

// Função principal usada pelas páginas: tenta o Google Sheets primeiro,
// e só usa o produtos.json local se algo falhar.
async function carregarListaDeProdutos(){
  if(linksConfigurados()){
    try{
      const lista = await carregarProdutosDoGoogleSheets();
      if(lista && lista.length){
        return { lista, origem: 'google-sheets' };
      }
    }catch(e){
      console.warn('Falha ao carregar do Google Sheets, usando produtos.json local.', e);
    }
  }
  const lista = await carregarProdutosLocal();
  return { lista, origem: 'local' };
}
