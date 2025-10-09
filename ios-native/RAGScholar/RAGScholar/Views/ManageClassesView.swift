//
//  ManageClassesView.swift
//  RAGScholar
//
//  Class management with liquid glass styling
//

import SwiftUI

struct ManageClassesView: View {
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme

    @State private var showingCreateClass = false
    @State private var editingClass: UserClass?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Manage Your Classes")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(colorScheme == .dark ? .white : .black)

                        Text("Create, edit, and organize your classes")
                            .font(.system(size: 14))
                            .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                    }
                    .padding(.horizontal)
                    .padding(.top)

                    // Create New Class Button
                    GlassEffectContainer {
                        Button(action: {
                            showingCreateClass = true
                        }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(Color(red: 0.61, green: 0.42, blue: 1.0))

                                Text("Create New Class")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(colorScheme == .dark ? .white : .black)

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.4) : .black.opacity(0.3))
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                        }
                        .glassEffect(in: RoundedRectangle(cornerRadius: 16))
                    }
                    .padding(.horizontal)

                    // Existing Classes
                    if !classManager.classes.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Your Classes")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                                .padding(.horizontal)

                            GlassEffectContainer(spacing: 12) {
                                VStack(spacing: 12) {
                                    ForEach(classManager.classes) { userClass in
                                        ClassRow(userClass: userClass) {
                                            editingClass = userClass
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.bottom, 80)
            }
            .background(colorScheme == .dark ? Color(red: 0.11, green: 0.11, blue: 0.11) : Color.white)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(Color(red: 0.61, green: 0.42, blue: 1.0))
                }
            }
            .sheet(isPresented: $showingCreateClass) {
                CreateClassView()
            }
            .sheet(item: $editingClass) { userClass in
                EditClassView(classToEdit: userClass)
            }
        }
    }
}

struct ClassRow: View {
    let userClass: UserClass
    let onEdit: () -> Void
    @EnvironmentObject var classManager: ClassManager
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        Button(action: onEdit) {
            HStack(spacing: 16) {
                // Domain Icon
                ZStack {
                    Circle()
                        .fill(Color(red: 0.61, green: 0.42, blue: 1.0).opacity(0.2))
                        .frame(width: 48, height: 48)

                    Image(systemName: userClass.domainType.icon)
                        .font(.system(size: 20))
                        .foregroundColor(Color(red: 0.61, green: 0.42, blue: 1.0))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(userClass.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)

                    Text(userClass.domainType.displayName)
                        .font(.system(size: 13))
                        .foregroundColor(colorScheme == .dark ? .white.opacity(0.6) : .black.opacity(0.5))
                }

                Spacer()

                if classManager.activeClass?.id == userClass.id {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.green)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(colorScheme == .dark ? .white.opacity(0.4) : .black.opacity(0.3))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .glassEffect(in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    ManageClassesView()
        .environmentObject(ClassManager.shared)
}
