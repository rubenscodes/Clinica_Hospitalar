// Aguarda o carregamento completo da página
document.addEventListener("DOMContentLoaded", function () {
    
    // 1. Mensagem de Boas-Vindas personalizada no Console ou Alerta suave
    console.log("Clínica Vida & Saúde - Sistema carregado com sucesso.");

    // 2. Destacar o médico de plantão do dia atual automaticamente
    destacarMedicoDoDia();

    // 3. Validação e Interação do Formulário de Feedback/Ouvidoria
    const formularioFeedback = document.querySelector("main section:last-of-type form");
    
    if (formularioFeedback) {
        formularioFeedback.addEventListener("submit", function (evento) {
            // Evita o recarregamento padrão da página para simular o envio dinâmico
            evento.preventDefault();

            const nomeUsuario = document.getElementById("nome").value.trim();
            const emailUsuario = document.getElementById("email").value.trim();
            const comentarios = document.getElementById("comentarios").value.trim();

            if (nomeUsuario === "" || emailUsuario === "" || comentarios === "") {
                alert("Por favor, preencha todos os campos do formulário de feedback.");
            } else {
                alert(`Obrigado pelo contato, ${nomeUsuario}! Sua mensagem foi enviada à nossa ouvidoria.`);
                formularioFeedback.reset(); // Limpa os campos após o envio
            }
        });
    }

    // 4. Validação simples no formulário principal de triagem
    const botaoEnviarTriagem = document.querySelector("main section:first-of-type form button");
    // Caso queira adicionar um botão de envio no final do form de triagem, 
    // ou podemos validar quando o usuário interagir com o campo de data.
    const inputData = document.getElementById("p4");
    if (inputData) {
        // Define a data mínima como o dia de hoje para evitar agendamentos no passado
        const hoje = new Date().toISOString().split("T")[0];
        inputData.min = hoje;
    }
});

// Função auxiliar para destacar médicos na lista com base no dia
function destacarMedicoDoDia() {
    const listaMedicos = document.querySelectorAll("main section ul li");
    const dataAtual = new Date();
    const diaSemana = dataAtual.getDay(); // 0 (Domingo) a 6 (Sábado)

    // Se for fim de semana (Sábado ou Domingo), dá um destaque especial na lista
    if (diaSemana === 0 || diaSemana === 6) {
        listaMedicos.forEach(li => {
            if (li.textContent.includes("Pronto Atendimento")) {
                li.style.fontWeight = "bold";
                li.style.color = "#009688";
            }
        });
    }
}