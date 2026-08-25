namespace ResQui.Application.Common;

public static class QrCode
{
    public static byte[] Png(string conteudo, int pixelsPorModulo = 8)
    {
        using var gerador = new QRCoder.QRCodeGenerator();
        using var dados = gerador.CreateQrCode(conteudo, QRCoder.QRCodeGenerator.ECCLevel.Q);
        return new QRCoder.PngByteQRCode(dados).GetGraphic(pixelsPorModulo);
    }
}
