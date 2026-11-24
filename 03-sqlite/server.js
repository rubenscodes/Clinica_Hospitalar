import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Banco SQLite em arquivo (fica fora da pasta public)
const db = new DatabaseSync(path.join(__dirname, 'clinica.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    especialidade TEXT NOT NULL,
    data TEXT NOT NULL,
    convenio TEXT NOT NULL,
    observacoes TEXT
  )
`);

const especialidades = [
  { value: 'cardiologia', label: 'Cardiologia' },
  { value: 'pediatria', label: 'Pediatria' },
  { value: 'ortopedia', label: 'Ortopedia & Traumatologia' },
  { value: 'pneumologia', label: 'Pneumologia' },
  { value: 'exames', label: 'Laboratório / Exames' }
];

const convenios = [
  { value: 'particular', label: 'Particular' },
  { value: 'unimed', label: 'Unimed' },
  { value: 'bradesco', label: 'Bradesco Saúde' },
  { value: 'amil', label: 'Amil' },
  { value: 'sulamerica', label: 'SulAmérica' }
];

function pagina(titulo, conteudo) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${titulo} — Clínica Vida & Saúde</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="container py-4">
      <h1 class="mb-4">${titulo}</h1>
      ${conteudo}
    </body>
    </html>
  `;
}

function validarAgendamento(nome, telefone, email, especialidade, data) {
  const erros = [];
  if (nome.length < 3) {
    erros.push('O nome precisa ter pelo menos 3 letras.');
  }
  if (telefone.length < 8) {
    erros.push('Informe um telefone válido.');
  }
  if (!email.includes('@')) {
    erros.push('Informe um e-mail válido.');
  }
  if (especialidade === '') {
    erros.push('Escolha uma especialidade.');
  }
  if (data === '') {
    erros.push('Escolha uma data preferencial.');
  }
  return erros;
}

// CREATE: verifica e-mail duplicado antes do INSERT
app.post('/agendamentos', function (req, res) {
  if (req.body === undefined) {
    res.status(400).send(pagina('Nenhum dado foi recebido', '<a href="/#agendamento">Voltar ao formulário</a>'));
    return;
  }

  const nome = (req.body.nome || '').trim();
  const telefone = (req.body.telefone || '').trim();
  const email = (req.body.email || '').trim();
  const especialidade = (req.body.especialidade || '').trim();
  const data = (req.body.data || '').trim();
  const convenio = (req.body.convenio || 'particular').trim();
  const observacoes = (req.body.observacoes || '').trim();

  const erros = validarAgendamento(nome, telefone, email, especialidade, data);

  if (erros.length === 0) {
    const existente = db.prepare('SELECT id FROM agendamentos WHERE email = ?').get(email);
    if (existente !== undefined) {
      erros.push('Este e-mail já está cadastrado');
    }
  }

  if (erros.length > 0) {
    let lista = '';
    for (const erro of erros) {
      lista += `<li>${erro}</li>`;
    }
    res.status(400).send(
      pagina('Não foi possível agendar', `<ul>${lista}</ul><a href="/#agendamento">Voltar ao formulário</a>`)
    );
    return;
  }

  const resultado = db
    .prepare(
      `INSERT INTO agendamentos (nome, telefone, email, especialidade, data, convenio, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(nome, telefone, email, especialidade, data, convenio, observacoes);

  res.status(201).send(
    pagina(
      'Consulta agendada!',
      `
      <p><strong>${nome}</strong>, seu agendamento de <strong>${especialidade}</strong> para o dia <strong>${data}</strong> foi salvo com o número <strong>#${resultado.lastInsertRowid}</strong>.</p>
      <a href="/agendamentos" class="btn btn-primary btn-sm">Ver todos os agendamentos</a>
      <a href="/#agendamento" class="btn btn-outline-secondary btn-sm">Agendar outra consulta</a>
      `
    )
  );
});

// READ (lista): busca todos os agendamentos com confirmação antes de excluir
app.get('/agendamentos', function (req, res) {
  const agendamentos = db
    .prepare('SELECT * FROM agendamentos ORDER BY data ASC, nome ASC')
    .all();

  let linhas = '';
  for (const ag of agendamentos) {
    linhas += `
      <tr>
        <td>${ag.id}</td>
        <td><a href="/agendamentos/${ag.id}">${ag.nome}</a></td>
        <td>${ag.telefone}</td>
        <td>${ag.email}</td>
        <td>${ag.especialidade}</td>
        <td>${ag.data}</td>
        <td>${ag.convenio}</td>
        <td>${ag.observacoes || '-'}</td>
        <td>
          <a href="/agendamentos/${ag.id}" class="btn btn-sm btn-outline-secondary">Ficha</a>
          <a href="/agendamentos/${ag.id}/editar" class="btn btn-sm btn-outline-primary">Editar</a>
          <form action="/agendamentos/${ag.id}/excluir" method="post" class="d-inline" onsubmit="return confirm('Excluir este agendamento?')">
            <button type="submit" class="btn btn-sm btn-outline-danger">Excluir</button>
          </form>
        </td>
      </tr>
    `;
  }

  if (agendamentos.length === 0) {
    linhas = '<tr><td colspan="9">Nenhuma consulta agendada ainda.</td></tr>';
  }

  res.send(
    pagina(
      'Consultas agendadas',
      `
      <div class="table-responsive">
        <table class="table table-striped align-middle">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Paciente</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Especialidade</th>
              <th>Data</th>
              <th>Convênio</th>
              <th>Observações</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
      <a href="/#agendamento" class="btn btn-primary btn-sm">Agendar consulta</a>
      <a href="/" class="btn btn-outline-secondary btn-sm">Início</a>
      `
    )
  );
});

// READ (ficha): mostra os detalhes de um agendamento pelo ID ou retorna 404
app.get('/agendamentos/:id', function (req, res) {
  const agendamento = db
    .prepare('SELECT * FROM agendamentos WHERE id = ?')
    .get(req.params.id);

  if (agendamento === undefined) {
    res.status(404).send(pagina('Agendamento não encontrado', '<a href="/agendamentos">Voltar à lista</a>'));
    return;
  }

  res.send(
    pagina(
      'Ficha do agendamento',
      `
      <div class="card col-md-6 p-3 mb-3">
        <p class="mb-2"><strong>Número (ID):</strong> ${agendamento.id}</p>
        <p class="mb-2"><strong>Paciente:</strong> ${agendamento.nome}</p>
        <p class="mb-2"><strong>Telefone / WhatsApp:</strong> ${agendamento.telefone}</p>
        <p class="mb-2"><strong>E-mail:</strong> ${agendamento.email}</p>
        <p class="mb-2"><strong>Especialidade:</strong> ${agendamento.especialidade}</p>
        <p class="mb-2"><strong>Data Preferencial:</strong> ${agendamento.data}</p>
        <p class="mb-2"><strong>Convênio:</strong> ${agendamento.convenio}</p>
        <p class="mb-0"><strong>Observações:</strong> ${agendamento.observacoes || 'Nenhuma'}</p>
      </div>
      <a href="/agendamentos/${agendamento.id}/editar" class="btn btn-primary btn-sm">Editar</a>
      <form action="/agendamentos/${agendamento.id}/excluir" method="post" class="d-inline" onsubmit="return confirm('Excluir este agendamento?')">
        <button type="submit" class="btn btn-danger btn-sm">Excluir</button>
      </form>
      <a href="/agendamentos" class="btn btn-link">Voltar à lista</a>
      `
    )
  );
});

// BUSCA: filtra por nome do paciente ou especialidade usando LIKE ? e all()
app.get('/busca', function (req, res) {
  const termo = req.query.termo || '';
  const encontrados = db
    .prepare(
      `SELECT * FROM agendamentos
       WHERE nome LIKE ? OR especialidade LIKE ?
       ORDER BY data ASC, nome ASC`
    )
    .all(`%${termo}%`, `%${termo}%`);

  res.json(encontrados);
});

// READ (um para editar): abre o formulário de edição buscando WHERE id = ? com get()
app.get('/agendamentos/:id/editar', function (req, res) {
  const agendamento = db
    .prepare('SELECT * FROM agendamentos WHERE id = ?')
    .get(req.params.id);

  if (agendamento === undefined) {
    res.status(404).send(pagina('Agendamento não encontrado', '<a href="/agendamentos">Voltar à lista</a>'));
    return;
  }

  let opcoesEspecialidade = '';
  for (const esp of especialidades) {
    const selected = esp.value === agendamento.especialidade ? ' selected' : '';
    opcoesEspecialidade += `<option value="${esp.value}"${selected}>${esp.label}</option>`;
  }

  let opcoesConvenio = '';
  for (const conv of convenios) {
    const selected = conv.value === agendamento.convenio ? ' selected' : '';
    opcoesConvenio += `<option value="${conv.value}"${selected}>${conv.label}</option>`;
  }

  res.send(
    pagina(
      'Editar agendamento',
      `
      <form action="/agendamentos/${agendamento.id}/editar" method="post" class="col-md-6">
        <div class="mb-3">
          <label for="nome" class="form-label">Nome Completo</label>
          <input type="text" id="nome" name="nome" class="form-control" value="${agendamento.nome}" required>
        </div>
        <div class="mb-3">
          <label for="telefone" class="form-label">Telefone / WhatsApp</label>
          <input type="tel" id="telefone" name="telefone" class="form-control" value="${agendamento.telefone}" required>
        </div>
        <div class="mb-3">
          <label for="email" class="form-label">E-mail</label>
          <input type="email" id="email" name="email" class="form-control" value="${agendamento.email}" required>
        </div>
        <div class="mb-3">
          <label for="especialidade" class="form-label">Especialidade</label>
          <select id="especialidade" name="especialidade" class="form-select" required>${opcoesEspecialidade}</select>
        </div>
        <div class="mb-3">
          <label for="data" class="form-label">Data Preferencial</label>
          <input type="date" id="data" name="data" class="form-control" value="${agendamento.data}" required>
        </div>
        <div class="mb-3">
          <label for="convenio" class="form-label">Convênio</label>
          <select id="convenio" name="convenio" class="form-select" required>${opcoesConvenio}</select>
        </div>
        <div class="mb-3">
          <label for="observacoes" class="form-label">Observações</label>
          <textarea id="observacoes" name="observacoes" class="form-control" rows="3">${agendamento.observacoes || ''}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Salvar</button>
        <a href="/agendamentos" class="btn btn-link">Cancelar</a>
      </form>
      `
    )
  );
});

// UPDATE: impede e-mail duplicado em outro registro e atualiza WHERE id = ?
app.post('/agendamentos/:id/editar', function (req, res) {
  if (req.body === undefined) {
    res.status(400).send(pagina('Nenhum dado foi recebido', '<a href="/agendamentos">Voltar à lista</a>'));
    return;
  }

  const nome = (req.body.nome || '').trim();
  const telefone = (req.body.telefone || '').trim();
  const email = (req.body.email || '').trim();
  const especialidade = (req.body.especialidade || '').trim();
  const data = (req.body.data || '').trim();
  const convenio = (req.body.convenio || 'particular').trim();
  const observacoes = (req.body.observacoes || '').trim();

  const erros = validarAgendamento(nome, telefone, email, especialidade, data);

  if (erros.length === 0) {
    const duplicado = db
      .prepare('SELECT id FROM agendamentos WHERE email = ? AND id != ?')
      .get(email, req.params.id);
    if (duplicado !== undefined) {
      erros.push('Este e-mail já está cadastrado');
    }
  }

  if (erros.length > 0) {
    let lista = '';
    for (const erro of erros) {
      lista += `<li>${erro}</li>`;
    }
    res.status(400).send(
      pagina(
        'Não foi possível salvar',
        `<ul>${lista}</ul><a href="/agendamentos/${req.params.id}/editar">Voltar ao formulário</a>`
      )
    );
    return;
  }

  const resultado = db
    .prepare(
      `UPDATE agendamentos
       SET nome = ?, telefone = ?, email = ?, especialidade = ?, data = ?, convenio = ?, observacoes = ?
       WHERE id = ?`
    )
    .run(nome, telefone, email, especialidade, data, convenio, observacoes, req.params.id);

  if (resultado.changes === 0) {
    res.status(404).send(pagina('Agendamento não encontrado', '<a href="/agendamentos">Voltar à lista</a>'));
    return;
  }

  res.redirect('/agendamentos');
});

// DELETE: exclui o agendamento WHERE id = ? e redireciona para /agendamentos
app.post('/agendamentos/:id/excluir', function (req, res) {
  const resultado = db
    .prepare('DELETE FROM agendamentos WHERE id = ?')
    .run(req.params.id);

  if (resultado.changes === 0) {
    res.status(404).send(pagina('Agendamento não encontrado', '<a href="/agendamentos">Voltar à lista</a>'));
    return;
  }

  res.redirect('/agendamentos');
});

app.use(function (req, res) {
  res.status(404).send(pagina('404 - Página não encontrada', '<a href="/">Ir para o início</a>'));
});

app.listen(3000, function () {
  console.log('Servidor rodando em http://localhost:3000');
});