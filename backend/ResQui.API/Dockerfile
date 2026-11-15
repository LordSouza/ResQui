# Stage 1: build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore first (layer cache)
COPY Directory.Build.props .
COPY ResQui.Domain/ResQui.Domain.csproj                 ResQui.Domain/packages.lock.json         ResQui.Domain/
COPY ResQui.Application/ResQui.Application.csproj       ResQui.Application/packages.lock.json    ResQui.Application/
COPY ResQui.Infrastructure/ResQui.Infrastructure.csproj ResQui.Infrastructure/packages.lock.json ResQui.Infrastructure/
COPY ResQui.API/ResQui.API.csproj                       ResQui.API/packages.lock.json            ResQui.API/
RUN dotnet restore ResQui.API/ResQui.API.csproj --locked-mode

# Copy rest and publish
COPY . .
RUN dotnet publish ResQui.API/ResQui.API.csproj \
    -c Release -o /out --no-restore

# Stage 2: runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "ResQui.API.dll"]
